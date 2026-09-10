export const DURATION_VALUES = [
  "weekend",
  "one-week",
  "one-month",
  "over-one-month",
] as const;

// Keep the legacy staged generator's duration union stable while the live
// single-pass path supports the newer two-week option.
export type Duration = (typeof DURATION_VALUES)[number];

export const BUILD_DURATION_VALUES = [
  "weekend",
  "one-week",
  "two-weeks",
  "one-month",
  "over-one-month",
] as const;

export type BuildDuration = (typeof BUILD_DURATION_VALUES)[number];

export const IDEA_KIND_VALUES = ["safest", "stretch", "wildcard"] as const;
export type IdeaKind = (typeof IDEA_KIND_VALUES)[number];

export type ExcludedIdea = {
  id: string;
  title: string;
  pitch: string;
  kind: IdeaKind;
  capabilityEquation: string;
};

export type SpitballRequest = {
  username: string;
  topic?: string;
  duration: BuildDuration;
  excludedIdeas: ExcludedIdea[];
};

export type PortfolioRepository = {
  owner: string;
  name: string;
  url: string;
  description: string | null;
  updatedAt: string;
  language: string | null;
  topics: string[];
  readmeExcerpt: string;
  readmeTruncated: boolean;
};

export type EvidenceClaim = {
  claim: string;
  repositoryNames: string[];
};

export type BuilderProfile = {
  summary: string;
  themes: EvidenceClaim[];
  capabilities: EvidenceClaim[];
};

export type AbstractCapability = {
  id: string;
  label: string;
  mechanism: string;
  transferableAssets: string[];
};

export type CapabilityExtractionResult = {
  builderProfile: BuilderProfile;
  abstractCapabilities: AbstractCapability[];
};

export type ConceptCandidate = {
  id: string;
  kind: IdeaKind;
  title: string;
  pitch: string;
  problem: string;
  primaryDomain: string;
  interactionModel: string;
  capabilityIds: string[];
  capabilityEquation: string;
  transferRationale: string;
  learningGoals: string[];
  duration: Duration;
  buildPlan: Array<{
    label: string;
    outcome: string;
  }>;
  definitionOfDone: string[];
  searchQuery: string;
};

export type ConceptCandidateSet = {
  candidates: ConceptCandidate[];
};

export type GroundingSelection = {
  sourceCandidateId: string;
  kind: IdeaKind;
  whyThisBuilder: string;
  evidence: Array<{
    repositoryName: string;
    repositoryUrl: string;
    contribution: string;
  }>;
  reusablePieces: string[];
  topicFit?: string;
};

export type GroundingSelectionResult = {
  selections: GroundingSelection[];
  preliminaryRecommendationKind: IdeaKind;
};

export type LandscapeProject = {
  name: string;
  url: string;
  description: string;
  similarity: string;
};

export type SpitballIdea = {
  id: string;
  kind: IdeaKind;
  title: string;
  pitch: string;
  problem: string;
  capabilityEquation: string;
  whyThisBuilder: string;
  evidence: Array<{
    repositoryName: string;
    repositoryUrl: string;
    contribution: string;
  }>;
  reusablePieces: string[];
  learningGoals: string[];
  topicFit?: string;
  duration: BuildDuration;
  buildPlan: Array<{
    label: string;
    outcome: string;
  }>;
  definitionOfDone: string[];
  landscape: {
    scope: "github-repositories";
    similarProjects: LandscapeProject[];
    differentiator: string;
    disclaimer: string;
    incompleteSearch: boolean;
  };
  recommendationReason?: string;
};

export type SpitballRun = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  input: {
    username: string;
    topic?: string;
    duration: BuildDuration;
  };
  portfolio: {
    consideredCount: number;
    analyzedRepositories: Array<{
      name: string;
      url: string;
    }>;
    evidenceLevel: "limited" | "standard";
  };
  builderProfile: BuilderProfile;
  ideas: [SpitballIdea, SpitballIdea, SpitballIdea];
  recommendationId: string;
};

export type RunErrorCode =
  | "INVALID_REQUEST"
  | "GITHUB_USER_NOT_FOUND"
  | "NO_ELIGIBLE_REPOSITORIES"
  | "GITHUB_RATE_LIMITED"
  | "GITHUB_UNAVAILABLE"
  | "FEATHERLESS_UNAVAILABLE"
  | "AI_OUTPUT_INVALID"
  | "LANDSCAPE_FAILED"
  | "STREAM_INVALID"
  | "UNKNOWN";

export type StreamEvent =
  | { type: "run_started"; runId: string }
  | {
      type: "stage";
      stage: "portfolio" | "ideation" | "landscape" | "finalizing";
    }
  | { type: "repository"; name: string; url: string }
  | { type: "complete"; result: SpitballRun }
  | {
      type: "error";
      code: RunErrorCode;
      message: string;
      retryable: boolean;
    };

export type DraftIdea = Omit<SpitballIdea, "id" | "landscape" | "recommendationReason"> & {
  searchQuery: string;
};

export type DraftPortfolioResult = {
  builderProfile: BuilderProfile;
  ideas: [DraftIdea, DraftIdea, DraftIdea];
  preliminaryRecommendationKind: IdeaKind;
};

export type LandscapeCandidate = {
  name: string;
  url: string;
  description: string;
  stars: number;
  updatedAt: string;
};

export type LandscapeSearchBundle = {
  ideaKind: IdeaKind;
  query: string;
  incompleteResults: boolean;
  projects: LandscapeCandidate[];
};

export type FinalIdea = Omit<SpitballIdea, "id" | "recommendationReason">;

export type FinalPortfolioResult = {
  builderProfile: BuilderProfile;
  ideas: [FinalIdea, FinalIdea, FinalIdea];
  recommendationKind: IdeaKind;
  recommendationReason: string;
};

export type StarredIdea = {
  idea: SpitballIdea;
  savedAt: string;
};