import { describe, expect, it } from "vitest";

import { SpitballRequestSchema, SpitballRunSchema } from "@/lib/ai/schemas";
import { fixtureRun } from "./fixtures";

describe("Spitball schemas", () => {
  it("accepts a complete valid run", () => {
    expect(SpitballRunSchema.parse(fixtureRun)).toEqual(fixtureRun);
  });

  it("rejects duplicate idea kinds", () => {
    const invalid = structuredClone(fixtureRun);
    invalid.ideas[2].kind = "stretch";
    expect(SpitballRunSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects evidence that is not in the analyzed portfolio", () => {
    const invalid = structuredClone(fixtureRun);
    invalid.ideas[0].evidence[0].repositoryName = "ImaginaryRepo";
    expect(SpitballRunSchema.safeParse(invalid).success).toBe(false);
  });

  it("normalizes an empty topic and defaults exclusions", () => {
    const request = SpitballRequestSchema.parse({
      username: " TONZHub ",
      topic: "   ",
      duration: "one-week",
    });
    expect(request).toEqual({ username: "TONZHub", topic: undefined, duration: "one-week", excludedIdeas: [] });
  });
});
