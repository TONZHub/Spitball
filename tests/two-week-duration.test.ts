import { describe, expect, it, vi } from "vitest";

import { draftPortfolioIdeasGrokShaped } from "@/lib/ai/grok-shaped-draft";
import { LiveSpitballRequestSchema } from "@/lib/ai/live-request-schema";
import type { PortfolioRepository } from "@/types/spitball";

const repository: PortfolioRepository = {
  owner: "tester",
  name: "EvidenceApp",
  url: "https://github.com/tester/EvidenceApp",
  description: "An evidence-aware learning app",
  updatedAt: "2026-09-10T00:00:00Z",
  language: "TypeScript",
  topics: ["education", "ai"],
  readmeExcerpt: "The app links claims to inspectable evidence and keeps model actions behind explicit rules.",
  readmeTruncated: false,
};

function apiResponse(content: unknown): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("two-week builds", () => {
  it("accepts two-weeks as a live request duration", () => {
    const parsed = LiveSpitballRequestSchema.parse({
      username: "tester",
      duration: "two-weeks",
      excludedIdeas: [],
    });

    expect(parsed.duration).toBe("two-weeks");
  });

  it("tells the creative model it has two weeks and preserves that duration", async () => {
    let serializedBody = "";
    const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
      serializedBody = String(init?.body || "");
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
        recommendationKind: "stretch",
      });
    });

    const result = await draftPortfolioIdeasGrokShaped(
      {
        username: "tester",
        duration: "two-weeks",
        repositories: [repository],
        excludedIdeas: [],
      },
      {
        featherlessApiKey: "test-key",
        featherlessModel: "test-model",
        fetchImpl,
      },
    );

    expect(serializedBody).toContain("Available time: two weeks.");
    expect(result.ideas.every((idea) => idea.duration === "two-weeks")).toBe(true);
  });
});
