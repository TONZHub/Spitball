import { describe, expect, it } from "vitest";

import { findIdeaCollision, ideasAreSubstantiallySimilar } from "@/lib/similarity";
import { fixtureRun } from "./fixtures";

describe("idea similarity", () => {
  it("recognizes normalized title duplicates", () => {
    expect(
      ideasAreSubstantiallySimilar(
        { title: "Signal Garden!", pitch: "One pitch", capabilityEquation: "A + B" },
        { title: "signal-garden", pitch: "Another pitch", capabilityEquation: "C + D" },
      ),
    ).toBe(true);
  });

  it("keeps genuinely different ideas separate", () => {
    expect(
      ideasAreSubstantiallySimilar(
        { title: "Signal Garden", pitch: "Visualize provenance", capabilityEquation: "Patches + graphs" },
        { title: "Recipe Relay", pitch: "Coordinate community meals", capabilityEquation: "Pantry + calendars" },
      ),
    ).toBe(false);
  });

  it("finds a collision with a starred idea", () => {
    expect(
      findIdeaCollision(fixtureRun.ideas, [
        {
          id: "saved-1",
          title: "Signal Garden",
          pitch: "Saved already",
          kind: "safest",
          capabilityEquation: "Anything",
        },
      ]),
    ).toEqual({ leftId: "idea-safest", rightId: "saved-1" });
  });
});
