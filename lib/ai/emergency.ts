import type {
  BuildDuration,
  DraftIdea,
  DraftPortfolioResult,
  IdeaKind,
  PortfolioRepository,
} from "@/types/spitball";

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function topicLabel(topic?: string): string {
  return clip(topic?.trim() || "Everyday Systems", 48);
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
}

function reusablePieces(repositories: PortfolioRepository[]): string[] {
  const languages = unique(repositories.map((repository) => repository.language)).slice(0, 3);
  const topics = unique(repositories.flatMap((repository) => repository.topics)).slice(0, 3);
  const pieces = [
    ...languages.map((language) => `${language} implementation experience`),
    ...topics.map((topic) => `${topic} domain vocabulary`),
    "versioned source and README documentation",
  ];
  return unique(pieces).slice(0, 6);
}

function evidenceFor(repositories: PortfolioRepository[]) {
  return repositories.slice(0, 2).map((repository) => ({
    repositoryName: repository.name,
    repositoryUrl: repository.url,
    contribution:
      "Public repository evidence shows a documented build process and inspectable implementation choices that can transfer into a new prototype without copying the old product form.",
  }));
}

function planFor(duration: BuildDuration, interaction: string) {
  const first = {
    label: "Make the smallest loop",
    outcome: `Build one end-to-end ${interaction} interaction with hardcoded sample content before adding breadth.`,
  };
  const second = {
    label: "Put it in front of someone",
    outcome: "Run one real use session, note where the concept becomes confusing or boring, and fix that path first.",
  };
  const third = {
    label: "Package the proof",
    outcome: "Polish the strongest interaction, add a tiny README/demo, and stop before the concept grows into a platform.",
  };

  return duration === "weekend" ? [first, second] : [first, second, third];
}

function buildIdea(input: {
  kind: IdeaKind;
  title: string;
  pitch: string;
  problem: string;
  equation: string;
  why: string;
  interaction: string;
  learningGoal: string;
  duration: BuildDuration;
  topic?: string;
  repositories: PortfolioRepository[];
  query: string;
}): DraftIdea {
  return {
    kind: input.kind,
    title: clip(input.title, 120),
    pitch: clip(input.pitch, 500),
    problem: clip(input.problem, 1_500),
    capabilityEquation: clip(input.equation, 500),
    whyThisBuilder: clip(input.why, 1_500),
    evidence: evidenceFor(input.repositories),
    reusablePieces: reusablePieces(input.repositories),
    learningGoals: [clip(input.learningGoal, 500)],
    ...(input.topic ? { topicFit: clip(`Directly explores the requested direction: ${input.topic}.`, 800) } : {}),
    duration: input.duration,
    buildPlan: planFor(input.duration, input.interaction),
    definitionOfDone: [
      "A stranger can understand the premise without an explanation from the builder.",
      "One complete interaction works from start to finish on the intended device or physical setup.",
    ],
    searchQuery: clip(input.query, 160),
  };
}

export function buildEmergencyDraft(input: {
  topic?: string;
  duration: BuildDuration;
  repositories: PortfolioRepository[];
}): DraftPortfolioResult {
  const subject = topicLabel(input.topic);
  const repoNames = input.repositories.map((repository) => repository.name);
  const languages = unique(input.repositories.map((repository) => repository.language));
  const topics = unique(input.repositories.flatMap((repository) => repository.topics));
  const techSummary = languages.length > 0 ? languages.slice(0, 4).join(", ") : "documented software projects";
  const themeSummary = topics.length > 0 ? topics.slice(0, 5).join(", ") : "multiple public project domains";

  const builderProfile = {
    summary: `Public repository evidence shows repeated experience turning scoped ideas into documented, versioned software prototypes using ${techSummary}.`,
    themes: [
      {
        claim: `The public portfolio spans ${themeSummary}, which supports transferring familiar build habits into a new subject instead of repeating one product category.`,
        repositoryNames: repoNames,
      },
    ],
    capabilities: [
      {
        claim: "Can turn a bounded concept into an inspectable prototype with explicit implementation choices and documentation.",
        repositoryNames: repoNames,
      },
      {
        claim: "Can reuse versioned project structure and interface patterns while changing the domain and interaction model.",
        repositoryNames: repoNames,
      },
    ],
  };

  const equation = "documented rapid prototyping + repository-driven iteration";
  const why = `${builderProfile.summary} The emergency path deliberately changes the interaction model and domain framing while reusing only those demonstrated build habits.`;

  const safest = buildIdea({
    kind: "safest",
    title: `${subject} Field Deck`,
    pitch: `A phone-friendly set of short observation missions that turns ${subject} into something people actively notice, compare, and collect instead of just reading about.`,
    problem: `Curiosity about ${subject} often stops at passive information. A tiny mission deck creates a reason to look closely, make a choice, and leave with a concrete observation.`,
    equation,
    why,
    interaction: "mission-card",
    learningGoal: "Design a compact field interaction that works without becoming another dashboard or tracker.",
    duration: input.duration,
    topic: input.topic,
    repositories: input.repositories,
    query: `${subject} field guide scavenger observation project`,
  });

  const stretch = buildIdea({
    kind: "stretch",
    title: `${subject} Cabinet Game`,
    pitch: `A cooperative tabletop/web hybrid where players reveal, trade, and challenge strange facts about ${subject} to complete a shared cabinet of discoveries.`,
    problem: `Explaining ${subject} can become a lecture. Turning evidence and uncertainty into a social game makes the subject conversational and gives people a reason to question each other's assumptions.`,
    equation: `${equation} + social rule design`,
    why,
    interaction: "cooperative tabletop/web hybrid",
    learningGoal: "Translate software logic into a social ruleset where the interface supports play instead of dominating it.",
    duration: input.duration,
    topic: input.topic,
    repositories: input.repositories,
    query: `${subject} tabletop game museum education prototype`,
  });

  const wildcard = buildIdea({
    kind: "wildcard",
    title: `${subject} Signal Room`,
    pitch: `A small participatory installation where visitors trigger light, sound, or projected responses inspired by ${subject}, gradually building a shared room-scale pattern from individual actions.`,
    problem: `Most digital projects keep the user staring at a screen. This moves the same ability to structure inputs and outputs into a physical, collective experience with a clear beginning and end.`,
    equation: `${equation} + event-to-environment mapping`,
    why,
    interaction: "participatory physical installation",
    learningGoal: "Prototype a physical or ambient interaction that treats software as invisible infrastructure rather than the product surface.",
    duration: input.duration,
    topic: input.topic,
    repositories: input.repositories,
    query: `${subject} interactive installation projection sound exhibit`,
  });

  return {
    builderProfile,
    ideas: [safest, stretch, wildcard],
    preliminaryRecommendationKind: "stretch",
  };
}