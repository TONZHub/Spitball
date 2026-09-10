import { describe, expect, it, vi } from "vitest";

import { draftPortfolioIdeasGrokShaped } from "@/lib/ai/grok-shaped-draft";
import type { PortfolioRepository } from "@/types/spitball";

const repository: PortfolioRepository = {
  owner: "tester",
  name: "EvidenceApp",
  url: "https://github.com/tester/EvidenceApp",
  description: "An evidence-aware learning app",
  updatedAt: "2026-09-10T00:00:00Z",
  language: "TypeScript",
  topics: ["education", "ai"],
  readmeExcerpt: "The app links claims to inspectable evidence and keeps model actions behind explicit application rules.",
  readmeTruncated: false,
};

function apiResponse(content: unknown): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("Grok-shaped Spitball generation", () => {
  it("uses one JSON-mode request and fills routine card structure in code", async () => {
    let body: Record<string, unknown> | undefined;
    const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return apiResponse({
        reading: [
          {
            repo: "EvidenceApp",
            did: "Built inspectable evidence links around model-assisted decisions.",
          },
        ],
        ideas: [
          { kind: "safest", title: "Trail Tag", pitch: "A tiny field tool for marking uncertain trail hazards." },
          { kind: "stretch", title: "Kitchen Relay", pitch: "A cooperative cooking handoff game for shared kitchens." },
          { kind: "wildcard", title: "Museum Ghost Labels", pitch: "Temporary exhibit labels that reveal disputed provenance as visitors move." },
        ],
        recommendationKind: "wildcard",
      });
    });

    const result = await draftPortfolioIdeasGrokShaped(
      {
        username: "tester",
        duration: "one-week",
        repositories: [repository],
        excludedIdeas: [],
      },
      {
        featherlessApiKey: "test-key",
        featherlessModel: "test-model",
        fetchImpl,
      },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(body?.response_format).toEqual({ type: "json_object" });
    expect(body?.model).toBe("test-model");
    expect(result.ideas.map((idea) => idea.kind)).toEqual(["safest", "stretch", "wildcard"]);
    expect(result.ideas[0].buildPlan.length).toBeGreaterThanOrEqual(2);
    expect(result.ideas[0].evidence[0]?.repositoryName).toBe("EvidenceApp");
    expect(result.preliminaryRecommendationKind).toBe("wildcard");
  });

  it("puts short README evidence in the same creative request instead of a separate analysis call", async () => {
    let serializedBody = "";
    const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
      serializedBody = String(init?.body || "");
      return apiResponse({
        reading: [],
        ideas: [
          { kind: "safest", title: "One", pitch: "First distinct idea." },
          { kind: "stretch", title: "Two", pitch: "Second distinct idea." },
          { kind: "wildcard", title: "Three", pitch: "Third distinct idea." },
        ],
      });
    });

    await draftPortfolioIdeasGrokShaped(
      {
        username: "tester",
        topic: "civic tools",
        duration: "weekend",
        repositories: [repository],
        excludedIdeas: [],
      },
      { featherlessApiKey: "test-key", featherlessModel: "test-model", fetchImpl },
    );

    expect(serializedBody).toContain("EvidenceApp");
    expect(serializedBody).toContain("links claims to inspectable evidence");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
