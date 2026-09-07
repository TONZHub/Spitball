import type { Duration, SpitballIdea } from "@/types/spitball";

const durationLabels: Record<Duration, string> = {
  weekend: "Weekend",
  "one-week": "One Week",
  "one-month": "One Month",
  "over-one-month": "More Than a Month",
};

function line(value: string): string {
  return value.replace(/\r?\n+/g, " ").trim();
}

function bullets(values: string[]): string {
  return values.map((value) => `- ${line(value)}`).join("\n");
}

export function safeMarkdownFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
  return `spitball-${slug || "idea"}.md`;
}

export function ideaToMarkdown(idea: SpitballIdea): string {
  const evidence = idea.evidence
    .map(
      (item) =>
        `- [${line(item.repositoryName)}](${item.repositoryUrl}) — ${line(item.contribution)}`,
    )
    .join("\n");
  const similarProjects = idea.landscape.similarProjects.length
    ? idea.landscape.similarProjects
        .map(
          (project) =>
            `- [${line(project.name)}](${project.url}) — ${line(project.similarity)} ${line(project.description)}`,
        )
        .join("\n")
    : "- The limited GitHub check found no close public repository match.";
  const buildPlan = idea.buildPlan
    .map((step, index) => `${index + 1}. **${line(step.label)}:** ${line(step.outcome)}`)
    .join("\n");

  return [
    `# ${line(idea.title)}`,
    "",
    `**Category:** ${idea.kind === "safest" ? "Safest Bet" : idea.kind === "stretch" ? "Interesting Stretch" : "Wild Card"}`,
    `**Available time:** ${durationLabels[idea.duration]}`,
    "",
    "## Pitch",
    "",
    line(idea.pitch),
    "",
    "## Problem",
    "",
    line(idea.problem),
    "",
    "## Why This Fits Your Portfolio",
    "",
    line(idea.whyThisBuilder),
    "",
    `> **Capability remix:** ${line(idea.capabilityEquation)}`,
    "",
    "## Repository Evidence",
    "",
    evidence,
    "",
    "## Reusable Pieces",
    "",
    bullets(idea.reusablePieces),
    "",
    "## What You Will Learn",
    "",
    bullets(idea.learningGoals),
    ...(idea.topicFit
      ? ["", "## Topic Fit", "", line(idea.topicFit)]
      : []),
    "",
    "## GitHub Landscape Check",
    "",
    similarProjects,
    "",
    "### Possible Differentiator",
    "",
    line(idea.landscape.differentiator),
    "",
    `> ${line(idea.landscape.disclaimer)}`,
    ...(idea.landscape.incompleteSearch
      ? ["", "> GitHub reported that this search may contain incomplete results."]
      : []),
    "",
    "## Build Plan",
    "",
    buildPlan,
    "",
    "## Definition of Done",
    "",
    bullets(idea.definitionOfDone),
    ...(idea.recommendationReason
      ? ["", "## Why Spitball Recommends It", "", line(idea.recommendationReason)]
      : []),
    "",
  ].join("\n");
}
