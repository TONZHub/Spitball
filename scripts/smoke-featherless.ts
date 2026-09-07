import { draftPortfolioIdeas } from "../lib/ai/featherless";
import type { PortfolioRepository } from "../types/spitball";

const repository: PortfolioRepository = {
  owner: "TONZHub",
  name: "Velvet_Signal",
  url: "https://github.com/TONZHub/Velvet_Signal",
  description: "A publication and structured context patch system for humans and agents.",
  updatedAt: "2026-09-06T00:00:00Z",
  language: "Python",
  topics: ["ai", "provenance", "education"],
  readmeExcerpt:
    "Velvet Signal publishes readable issues for people and structured context patches for agents. Claims include provenance, scope, expiry, and relationships to older claims.",
  readmeTruncated: false,
};

try {
  const result = await draftPortfolioIdeas({
    username: "TONZHub",
    topic: "education",
    duration: "one-week",
    repositories: [repository],
    excludedIdeas: [],
  });
  console.log(
    JSON.stringify(
      {
        model: process.env.FEATHERLESS_MODEL,
        profile: result.builderProfile.summary,
        ideas: result.ideas.map(({ kind, title, searchQuery }) => ({ kind, title, searchQuery })),
        recommendation: result.preliminaryRecommendationKind,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : "Featherless smoke failed");
  process.exitCode = 1;
}
