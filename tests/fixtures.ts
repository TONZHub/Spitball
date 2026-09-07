import type { SpitballIdea, SpitballRun } from "@/types/spitball";

export const fixtureIdea: SpitballIdea = {
  id: "idea-safest",
  kind: "safest",
  title: "Signal Garden",
  pitch: "Turn structured context patches into a visual learning trail.",
  problem: "Builders lose the reasoning behind changing project decisions.",
  capabilityEquation: "Velvet Signal + Receipts + notebook UX",
  whyThisBuilder: "The portfolio shows provenance work, event capture, and expressive interfaces.",
  evidence: [
    {
      repositoryName: "Velvet_Signal",
      repositoryUrl: "https://github.com/TONZHub/Velvet_Signal",
      contribution: "Provides provenance-aware context patch concepts.",
    },
  ],
  reusablePieces: ["Structured claim schema", "Evidence-aware UI language"],
  learningGoals: ["Visualize changing structured data"],
  topicFit: "Supports project-based learning and reflection.",
  duration: "one-week",
  buildPlan: [
    { label: "Day 1", outcome: "Render a static learning trail." },
    { label: "Days 2–5", outcome: "Add ingestion, comparison, and polish." },
  ],
  definitionOfDone: ["A user can inspect one complete trail."],
  landscape: {
    scope: "github-repositories",
    similarProjects: [
      {
        name: "example/history-viewer",
        url: "https://github.com/example/history-viewer",
        description: "A repository history interface.",
        similarity: "Both visualize a project's development history.",
      },
    ],
    differentiator: "Use evidence-backed AI context changes rather than commit metadata alone.",
    disclaimer: "This is a limited GitHub repository check, not an originality guarantee.",
    incompleteSearch: false,
  },
  recommendationReason: "It has the strongest balance of portfolio fit and one-week feasibility.",
};

function idea(kind: "safest" | "stretch" | "wildcard", id: string, title: string): SpitballIdea {
  return {
    ...fixtureIdea,
    id,
    kind,
    title,
    pitch: `${title} applies a distinct portfolio combination.`,
    capabilityEquation: `${title} capability A + capability B`,
    recommendationReason: kind === "safest" ? fixtureIdea.recommendationReason : undefined,
  };
}

export const fixtureRun: SpitballRun = {
  schemaVersion: 1,
  id: "run-1",
  createdAt: "2026-09-06T02:00:00.000Z",
  input: {
    username: "TONZHub",
    topic: "education",
    duration: "one-week",
  },
  portfolio: {
    consideredCount: 4,
    analyzedRepositories: [
      { name: "Velvet_Signal", url: "https://github.com/TONZHub/Velvet_Signal" },
    ],
    evidenceLevel: "limited",
  },
  builderProfile: {
    summary: "This portfolio repeatedly builds evidence-aware assistants.",
    themes: [{ claim: "Evidence and provenance", repositoryNames: ["Velvet_Signal"] }],
    capabilities: [{ claim: "Structured AI context", repositoryNames: ["Velvet_Signal"] }],
  },
  ideas: [
    idea("safest", "idea-safest", "Signal Garden"),
    idea("stretch", "idea-stretch", "Patch Tutor"),
    idea("wildcard", "idea-wild", "Context Carnival"),
  ],
  recommendationId: "idea-safest",
};
