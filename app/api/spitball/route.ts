import { NextResponse } from "next/server";

import { buildEmergencyDraft } from "@/lib/ai/emergency";
import { draftPortfolioIdeas, FeatherlessProviderError } from "@/lib/ai/featherless";
import { SpitballRequestSchema } from "@/lib/ai/schemas";
import { GitHubProviderError } from "@/lib/github/client";
import { loadPublicPortfolio } from "@/lib/github/portfolio";
import type { DraftPortfolioResult, ExcludedIdea, PortfolioRepository } from "@/types/spitball";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_PROVIDER_TIMEOUT_MS = 20_000;
const ANSWER_DEADLINE_MS = 45_000;
const MAX_DRAFT_CACHE_ENTRIES = 32;
const draftCache = new Map<string, DraftPortfolioResult>();

function draftCacheKey(input: {
  username: string;
  topic?: string;
  duration: string;
  excludedIdeas: ExcludedIdea[];
  repositories: PortfolioRepository[];
}): string {
  return JSON.stringify({
    username: input.username.toLowerCase(),
    topic: input.topic || "",
    duration: input.duration,
    excluded: input.excludedIdeas.map((idea) => idea.id).sort(),
    repositories: input.repositories.map((repository) => [repository.name, repository.updatedAt]),
  });
}

function rememberDraft(key: string, draft: DraftPortfolioResult): void {
  if (draftCache.has(key)) draftCache.delete(key);
  draftCache.set(key, draft);
  while (draftCache.size > MAX_DRAFT_CACHE_ENTRIES) {
    const oldestKey = draftCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    draftCache.delete(oldestKey);
  }
}

async function resilientDraft(input: {
  username: string;
  topic?: string;
  duration: "weekend" | "one-week" | "one-month" | "over-one-month";
  repositories: PortfolioRepository[];
  excludedIdeas: ExcludedIdea[];
}): Promise<DraftPortfolioResult> {
  const key = draftCacheKey(input);
  const cached = draftCache.get(key);
  if (cached) return cached;

  const emergency = buildEmergencyDraft({
    topic: input.topic,
    duration: input.duration,
    repositories: input.repositories,
  });

  const aiAttempt = draftPortfolioIdeas(input, { timeoutMs: AI_PROVIDER_TIMEOUT_MS })
    .then((draft) => {
      rememberDraft(key, draft);
      return draft;
    })
    .catch((error) => {
      console.warn(
        "Spitball AI pipeline degraded to deterministic ideas",
        error instanceof Error ? error.message : error,
      );
      return emergency;
    });

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<DraftPortfolioResult>((resolve) => {
    deadlineTimer = setTimeout(() => {
      console.warn(`Spitball AI pipeline exceeded ${ANSWER_DEADLINE_MS}ms; returning deterministic ideas.`);
      resolve(emergency);
    }, ANSWER_DEADLINE_MS);
  });

  const draft = await Promise.race([aiAttempt, deadline]);
  if (deadlineTimer) clearTimeout(deadlineTimer);
  return draft;
}

function errorResponse(error: unknown) {
  if (error instanceof GitHubProviderError) {
    const status = error.code === "GITHUB_USER_NOT_FOUND" ? 404 : error.code === "GITHUB_RATE_LIMITED" ? 429 : 502;
    return NextResponse.json(
      { error: error.message, code: error.code, retryable: error.retryable },
      { status },
    );
  }

  if (error instanceof FeatherlessProviderError) {
    const message = error.message.includes("could not be reached")
      ? "An AI provider timed out or could not be reached."
      : error.message;
    return NextResponse.json(
      { error: message, code: error.code, retryable: error.retryable },
      { status: 502 },
    );
  }

  console.error("Spitball request failed", error instanceof Error ? error.message : error);
  return NextResponse.json(
    { error: "Spitball hit an unexpected problem. Try again.", code: "UNKNOWN", retryable: true },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The request body was not valid JSON.", code: "INVALID_REQUEST", retryable: false },
      { status: 400 },
    );
  }

  const parsed = SpitballRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Check the form and try again.",
        code: "INVALID_REQUEST",
        retryable: false,
      },
      { status: 400 },
    );
  }

  const input = parsed.data;

  try {
    const portfolio = await loadPublicPortfolio(input.username);
    const draft = await resilientDraft({
      username: input.username,
      topic: input.topic,
      duration: input.duration,
      repositories: portfolio.repositories,
      excludedIdeas: input.excludedIdeas,
    });

    return NextResponse.json({
      input: {
        username: input.username,
        topic: input.topic,
        duration: input.duration,
      },
      portfolio: {
        consideredCount: portfolio.consideredCount,
        evidenceLevel: portfolio.evidenceLevel,
        repositories: portfolio.repositories.map((repository) => ({
          name: repository.name,
          url: repository.url,
          language: repository.language,
          description: repository.description,
        })),
      },
      builderProfile: draft.builderProfile,
      ideas: draft.ideas,
      recommendationKind: draft.preliminaryRecommendationKind,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
