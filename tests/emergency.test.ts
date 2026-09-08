import { describe, expect, it } from "vitest";

import { buildEmergencyDraft } from "@/lib/ai/emergency";
import { DraftPortfolioResultSchema } from "@/lib/ai/schemas";
import type { PortfolioRepository } from "@/types/spitball";

const repositories: PortfolioRepository[] = [
  {
    owner: "tester",
    name: "EvidenceApp",
    url: "https://github.com/tester/EvidenceApp",
    description: "An evidence-aware learning app",
    updatedAt: "2026-09-06T00:00:00Z",
    language: "TypeScript",
    topics: ["education", "evidence"],
    readmeExcerpt: "This app helps people learn by tracing claims to evidence.",
    readmeTruncated: false,
  },
];

describe("deterministic emergency draft", () => {
  it("always produces a schema-valid safe, stretch, and wildcard set", () => {
    const draft = buildEmergencyDraft({
      topic: "Tardigrades",
      duration: "weekend",
      repositories,
    });

    expect(DraftPortfolioResultSchema.safeParse(draft).success).toBe(true);
    expect(draft.ideas.map((idea) => idea.kind)).toEqual(["safest", "stretch", "wildcard"]);
    expect(draft.ideas.every((idea) => idea.title.includes("Tardigrades"))).toBe(true);
    expect(draft.ideas[2].title).toBe("Tardigrades Signal Room");
  });

  it("keeps evidence attached to real analyzed repositories", () => {
    const draft = buildEmergencyDraft({ duration: "one-week", repositories });
    for (const idea of draft.ideas) {
      expect(idea.evidence[0]).toMatchObject({
        repositoryName: "EvidenceApp",
        repositoryUrl: "https://github.com/tester/EvidenceApp",
      });
    }
  });
});
