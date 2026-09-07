import { describe, expect, it } from "vitest";

import { ideaToMarkdown, safeMarkdownFilename } from "@/lib/markdown";
import { fixtureIdea } from "./fixtures";

describe("Markdown artifacts", () => {
  it("uses a safe readable filename", () => {
    expect(safeMarkdownFilename("Café / Signal: Garden ✨")).toBe("spitball-cafe-signal-garden.md");
  });

  it("falls back when a title has no safe slug characters", () => {
    expect(safeMarkdownFilename("✨✨")).toBe("spitball-idea.md");
  });

  it("contains every required section and evidence link", () => {
    const markdown = ideaToMarkdown(fixtureIdea);
    for (const heading of [
      "## Pitch",
      "## Problem",
      "## Why This Fits Your Portfolio",
      "## Repository Evidence",
      "## Reusable Pieces",
      "## What You Will Learn",
      "## GitHub Landscape Check",
      "### Possible Differentiator",
      "## Build Plan",
      "## Definition of Done",
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain("https://github.com/TONZHub/Velvet_Signal");
    expect(markdown).toContain("not an originality guarantee");
  });
});
