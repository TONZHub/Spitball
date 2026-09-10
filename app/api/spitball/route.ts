import { NextResponse } from "next/server";

import { buildEmergencyDraft } from "@/lib/ai/emergency";
import { FeatherlessProviderError } from "@/lib/ai/featherless";
import { draftPortfolioIdeasSimple } from "@/lib/ai/simple-draft";
import { SpitballRequestSchema } from "@/lib/ai/schemas";
import { GitHubProviderError } from "@/lib/github/client";
import { loadPublicPortfolio } from "@/lib/github/portfolio";
import type { DraftPortfolioResult, ExcludedIdea, PortfolioRepository } from "@/types/spitball";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_PROVIDER_TIMEOUT_MS = 30_000;
const ANSWER_DEADLINE_MS = 90_000;

type GenerationMode = "ai" | "fallback";
type FallbackReason = "provider-error" | "deadline";

type ResilientDraftResult = {
  draft: DraftPortfolioResult;
  generationMode: GenerationMode;
  fallbackReason?: FallbackReason;
};

async function resilientDraft(input: {
  username: string;
  topic?: string;
  duration: "weekend" | "one-week" | "one-month" | "over-one-month";
  repositories: PortfolioRepository[];
  excludedIdeas: ExcludedIdea[];
}): Promise<ResilientDraftResult> {
  const emergency = buildEmergencyDraft({
    topic: input.topic,
    duration: input.duration,
    repositories: input.repositories,
  });

  const aiAttempt: Promise<ResilientDraftResult> = draftPortfolioIdeasSimple(input, {
    timeoutMs: AI_PROVIDER_TIMEOUT_MS,
  })
    .then((draft) => ({ draft, generationMode: "ai" as const }))
    .catch((error) => {
      console.warn(
        "Spitball AI pipeline degraded to deterministic ideas",
        error instanceof Error ? error.message : error,
      );
      return {
        draft: emergency,
        generationMode: "fallback" as const,
        fallbackReason: "provider-error" as const,
      };
    });

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<ResilientDraftResult>((resolve) => {
    deadlineTimer = setTimeout(() => {
      console.warn(`Spitball AI pipeline exceeded ${ANSWER_DEADLINE_MS}ms; returning deterministic ideas.`);
      resolve({
        draft: emergency,
        generationMode: "fallback",
        fallbackReason: "deadline",
      });
    }, ANSWER_DEADLINE_MS);
  });

  const result = await Promise.race([aiAttempt, deadline]);
  if (deadlineTimer) clearTimeout(deadlineTimer);
  return result;
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
    const generation = await resilientDraft({
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
      builderProfile: generation.draft.builderProfile,
      ideas: generation.draft.ideas,
      recommendationKind: generation.draft.preliminaryRecommendationKind,
      generationMode: generation.generationMode,
      ...(generation.fallbackReason ? { fallbackReason: generation.fallbackReason } : {}),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
