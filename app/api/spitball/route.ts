import { NextResponse } from "next/server";

import { draftPortfolioIdeas, FeatherlessProviderError } from "@/lib/ai/featherless";
import { SpitballRequestSchema } from "@/lib/ai/schemas";
import { GitHubProviderError } from "@/lib/github/client";
import { loadPublicPortfolio } from "@/lib/github/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof GitHubProviderError) {
    const status = error.code === "GITHUB_USER_NOT_FOUND" ? 404 : error.code === "GITHUB_RATE_LIMITED" ? 429 : 502;
    return NextResponse.json(
      { error: error.message, code: error.code, retryable: error.retryable },
      { status },
    );
  }

  if (error instanceof FeatherlessProviderError) {
    return NextResponse.json(
      { error: error.message, code: error.code, retryable: error.retryable },
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
    const draft = await draftPortfolioIdeas({
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
