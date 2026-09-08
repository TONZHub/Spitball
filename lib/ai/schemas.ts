import { z } from "zod";

import { DURATION_VALUES, IDEA_KIND_VALUES } from "@/types/spitball";

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const githubUrl = z
  .url()
  .refine((value) => value.startsWith("https://github.com/"), "Expected a GitHub URL");

export const DurationSchema = z.enum(DURATION_VALUES);
export const IdeaKindSchema = z.enum(IDEA_KIND_VALUES);

export const GitHubUsernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(39)
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/, "Invalid GitHub username")
  .refine((value) => !value.includes("--"), "Invalid GitHub username");

export const ExcludedIdeaSchema = z
  .object({
    id: requiredText(100),
    title: requiredText(120),
    pitch: requiredText(400),
    kind: IdeaKindSchema,
    capabilityEquation: requiredText(300),
  })
  .strict();

export const SpitballRequestSchema = z
  .object({
    username: GitHubUsernameSchema,
    topic: z.string().trim().max(200).optional().transform((value) => value || undefined),
    duration: DurationSchema,
    excludedIdeas: z.array(ExcludedIdeaSchema).max(50).default([]),
  })
  .strict();

export const PortfolioRepositorySchema = z
  .object({
    owner: requiredText(100),
    name: requiredText(100),
    url: githubUrl,
    description: z.string().trim().max(500).nullable(),
    updatedAt: z.iso.datetime({ offset: true }),
    language: z.string().trim().max(100).nullable(),
    topics: z.array(requiredText(100)).max(30),
    readmeExcerpt: z.string().max(10_000),
    readmeTruncated: z.boolean(),
  })
  .strict();

export const EvidenceClaimSchema = z
  .object({
    claim: requiredText(500),
    repositoryNames: z.array(requiredText(100)).min(1).max(25),
  })
  .strict();

const BuilderProfileSchema = z
  .object({
    summary: requiredText(2_000),
    themes: z.array(EvidenceClaimSchema).min(1).max(4),
    capabilities: z.array(EvidenceClaimSchema).min(1).max(6),
  })
  .strict();

export const AbstractCapabilitySchema = z
  .object({
    id: requiredText(40),
    label: requiredText(160),
    mechanism: requiredText(700).optional(),
    transferableAssets: z.array(requiredText(300)).min(1).max(6),
  })
  .strict()
  .transform((capability) => ({
    ...capability,
    mechanism:
      capability.mechanism ??
      `Applies ${capability.label} through ${capability.transferableAssets.slice(0, 3).join(", ")}.`,
  }));

export const CapabilityExtractionResultSchema = z
  .object({
    builderProfile: BuilderProfileSchema,
    abstractCapabilities: z.array(AbstractCapabilitySchema).min(2).max(8),
  })
  .strict()
  .superRefine((result, context) => {
    const ids = new Set(result.abstractCapabilities.map((capability) => capability.id));
    if (ids.size !== result.abstractCapabilities.length) {
      context.addIssue({
        code: "custom",
        path: ["abstractCapabilities"],
        message: "Abstract capability IDs must be unique",
      });
    }
  });

export const ConceptCandidateSchema = z
  .object({
    id: requiredText(40),
    kind: IdeaKindSchema,
    title: requiredText(120),
    pitch: requiredText(500),
    problem: requiredText(1_500),
    primaryDomain: requiredText(120),
    interactionModel: requiredText(160),
    capabilityIds: z.array(requiredText(40)).min(1).max(4),
    capabilityEquation: requiredText(500),
    transferRationale: requiredText(1_000),
    learningGoals: z.array(requiredText(500)).min(1).max(10),
    duration: DurationSchema,
    buildPlan: z
      .array(
        z.object({ label: requiredText(120), outcome: requiredText(800) }).strict(),
      )
      .min(1)
      .max(12),
    definitionOfDone: z.array(requiredText(500)).min(1).max(12),
    searchQuery: requiredText(160),
  })
  .strict();

export const ConceptCandidateSetSchema = z
  .object({
    candidates: z.array(ConceptCandidateSchema).length(6),
  })
  .strict()
  .superRefine((result, context) => {
    const ids = new Set(result.candidates.map((candidate) => candidate.id));
    if (ids.size !== result.candidates.length) {
      context.addIssue({
        code: "custom",
        path: ["candidates"],
        message: "Candidate IDs must be unique",
      });
    }

    for (const kind of IDEA_KIND_VALUES) {
      const count = result.candidates.filter((candidate) => candidate.kind === kind).length;
      if (count !== 2) {
        context.addIssue({
          code: "custom",
          path: ["candidates"],
          message: `Candidate set must contain exactly two ${kind} ideas`,
        });
      }
    }

    const domains = new Set(result.candidates.map((candidate) => candidate.primaryDomain.toLowerCase()));
    if (domains.size !== result.candidates.length) {
      context.addIssue({
        code: "custom",
        path: ["candidates"],
        message: "Each candidate must use a different primary domain",
      });
    }
  });

export const GroundingSelectionSchema = z
  .object({
    sourceCandidateId: requiredText(40),
    kind: IdeaKindSchema,
    whyThisBuilder: requiredText(1_500),
    evidence: z
      .array(
        z
          .object({
            repositoryName: requiredText(100),
            repositoryUrl: githubUrl,
            contribution: requiredText(800),
          })
          .strict(),
      )
      .min(1)
      .max(25),
    reusablePieces: z.array(requiredText(500)).min(1).max(12),
    topicFit: requiredText(800).optional(),
  })
  .strict();

export const GroundingSelectionResultSchema = z
  .object({
    selections: z.array(GroundingSelectionSchema).length(3),
    preliminaryRecommendationKind: IdeaKindSchema,
  })
  .strict()
  .superRefine((result, context) => {
    const kinds = new Set(result.selections.map((selection) => selection.kind));
    if (kinds.size !== 3 || IDEA_KIND_VALUES.some((kind) => !kinds.has(kind))) {
      context.addIssue({
        code: "custom",
        path: ["selections"],
        message: "Grounding must select one idea of each kind",
      });
    }

    const ids = new Set(result.selections.map((selection) => selection.sourceCandidateId));
    if (ids.size !== result.selections.length) {
      context.addIssue({
        code: "custom",
        path: ["selections"],
        message: "Grounding selections must reference unique candidates",
      });
    }
  });

export const LandscapeProjectSchema = z
  .object({
    name: requiredText(200),
    url: githubUrl,
    description: requiredText(800),
    similarity: requiredText(800),
  })
  .strict();

export const SpitballIdeaSchema = z
  .object({
    id: requiredText(100),
    kind: IdeaKindSchema,
    title: requiredText(120),
    pitch: requiredText(500),
    problem: requiredText(1_500),
    capabilityEquation: requiredText(500),
    whyThisBuilder: requiredText(1_500),
    evidence: z
      .array(
        z
          .object({
            repositoryName: requiredText(100),
            repositoryUrl: githubUrl,
            contribution: requiredText(800),
          })
          .strict(),
      )
      .min(1)
      .max(25),
    reusablePieces: z.array(requiredText(500)).min(1).max(12),
    learningGoals: z.array(requiredText(500)).min(1).max(10),
    topicFit: requiredText(800).optional(),
    duration: DurationSchema,
    buildPlan: z
      .array(
        z.object({ label: requiredText(120), outcome: requiredText(800) }).strict(),
      )
      .min(1)
      .max(12),
    definitionOfDone: z.array(requiredText(500)).min(1).max(12),
    landscape: z
      .object({
        scope: z.literal("github-repositories"),
        similarProjects: z.array(LandscapeProjectSchema).max(5),
        differentiator: requiredText(1_200),
        disclaimer: requiredText(500),
        incompleteSearch: z.boolean(),
      })
      .strict(),
    recommendationReason: requiredText(1_000).optional(),
  })
  .strict();

export const SpitballRunSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: requiredText(100),
    createdAt: z.iso.datetime({ offset: true }),
    input: z
      .object({
        username: GitHubUsernameSchema,
        topic: requiredText(200).optional(),
        duration: DurationSchema,
      })
      .strict(),
    portfolio: z
      .object({
        consideredCount: z.number().int().nonnegative(),
        analyzedRepositories: z
          .array(z.object({ name: requiredText(100), url: githubUrl }).strict())
          .min(1)
          .max(25),
        evidenceLevel: z.enum(["limited", "standard"]),
      })
      .strict(),
    builderProfile: BuilderProfileSchema,
    ideas: z.tuple([SpitballIdeaSchema, SpitballIdeaSchema, SpitballIdeaSchema]),
    recommendationId: requiredText(100),
  })
  .strict()
  .superRefine((run, context) => {
    const ideaIds = new Set(run.ideas.map((idea) => idea.id));
    if (ideaIds.size !== 3) {
      context.addIssue({ code: "custom", path: ["ideas"], message: "Idea IDs must be unique" });
    }

    const kinds = new Set(run.ideas.map((idea) => idea.kind));
    for (const kind of IDEA_KIND_VALUES) {
      if (!kinds.has(kind)) {
        context.addIssue({ code: "custom", path: ["ideas"], message: `Missing ${kind} idea` });
      }
    }

    const recommendation = run.ideas.find((idea) => idea.id === run.recommendationId);
    if (!recommendation) {
      context.addIssue({
        code: "custom",
        path: ["recommendationId"],
        message: "Recommendation must reference an idea",
      });
    } else if (!recommendation.recommendationReason) {
      context.addIssue({
        code: "custom",
        path: ["ideas", run.ideas.indexOf(recommendation), "recommendationReason"],
        message: "Recommended idea needs a reason",
      });
    }

    const repoByName = new Map(
      run.portfolio.analyzedRepositories.map((repository) => [repository.name, repository.url]),
    );

    for (const [ideaIndex, idea] of run.ideas.entries()) {
      if (idea.duration !== run.input.duration) {
        context.addIssue({
          code: "custom",
          path: ["ideas", ideaIndex, "duration"],
          message: "Idea duration must match the request",
        });
      }
      for (const [evidenceIndex, evidence] of idea.evidence.entries()) {
        if (repoByName.get(evidence.repositoryName) !== evidence.repositoryUrl) {
          context.addIssue({
            code: "custom",
            path: ["ideas", ideaIndex, "evidence", evidenceIndex],
            message: "Idea evidence must reference an analyzed repository",
          });
        }
      }
    }

    const validRepoNames = new Set(repoByName.keys());
    for (const [groupName, claims] of [
      ["themes", run.builderProfile.themes],
      ["capabilities", run.builderProfile.capabilities],
    ] as const) {
      for (const [claimIndex, claim] of claims.entries()) {
        for (const repositoryName of claim.repositoryNames) {
          if (!validRepoNames.has(repositoryName)) {
            context.addIssue({
              code: "custom",
              path: ["builderProfile", groupName, claimIndex, "repositoryNames"],
              message: "Profile claim must reference an analyzed repository",
            });
          }
        }
      }
    }
  });

export const DraftIdeaSchema = SpitballIdeaSchema.omit({
  id: true,
  landscape: true,
  recommendationReason: true,
}).extend({
  searchQuery: requiredText(160),
});

export const DraftPortfolioResultSchema = z
  .object({
    builderProfile: BuilderProfileSchema,
    ideas: z.tuple([DraftIdeaSchema, DraftIdeaSchema, DraftIdeaSchema]),
    preliminaryRecommendationKind: IdeaKindSchema,
  })
  .strict()
  .superRefine((draft, context) => {
    const kinds = new Set(draft.ideas.map((idea) => idea.kind));
    if (kinds.size !== 3 || IDEA_KIND_VALUES.some((kind) => !kinds.has(kind))) {
      context.addIssue({
        code: "custom",
        path: ["ideas"],
        message: "Draft must contain one idea of each kind",
      });
    }
  });

export const FinalIdeaSchema = SpitballIdeaSchema.omit({
  id: true,
  recommendationReason: true,
});

export const FinalPortfolioResultSchema = z
  .object({
    builderProfile: BuilderProfileSchema,
    ideas: z.tuple([FinalIdeaSchema, FinalIdeaSchema, FinalIdeaSchema]),
    recommendationKind: IdeaKindSchema,
    recommendationReason: requiredText(1_000),
  })
  .strict()
  .superRefine((result, context) => {
    const kinds = new Set(result.ideas.map((idea) => idea.kind));
    if (kinds.size !== 3 || IDEA_KIND_VALUES.some((kind) => !kinds.has(kind))) {
      context.addIssue({
        code: "custom",
        path: ["ideas"],
        message: "Final output must contain one idea of each kind",
      });
    }
    if (!kinds.has(result.recommendationKind)) {
      context.addIssue({
        code: "custom",
        path: ["recommendationKind"],
        message: "Recommendation kind must reference a final idea",
      });
    }
  });

export const RunErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "GITHUB_USER_NOT_FOUND",
  "NO_ELIGIBLE_REPOSITORIES",
  "GITHUB_RATE_LIMITED",
  "GITHUB_UNAVAILABLE",
  "FEATHERLESS_UNAVAILABLE",
  "AI_OUTPUT_INVALID",
  "LANDSCAPE_FAILED",
  "STREAM_INVALID",
  "UNKNOWN",
]);

export const StreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("run_started"), runId: requiredText(100) }).strict(),
  z
    .object({
      type: z.literal("stage"),
      stage: z.enum(["portfolio", "ideation", "landscape", "finalizing"]),
    })
    .strict(),
  z.object({ type: z.literal("repository"), name: requiredText(100), url: githubUrl }).strict(),
  z.object({ type: z.literal("complete"), result: SpitballRunSchema }).strict(),
  z
    .object({
      type: z.literal("error"),
      code: RunErrorCodeSchema,
      message: requiredText(500),
      retryable: z.boolean(),
    })
    .strict(),
]);

export const StarredIdeaSchema = z
  .object({ idea: SpitballIdeaSchema, savedAt: z.iso.datetime({ offset: true }) })
  .strict();

export const StoredStarredIdeasSchema = z
  .object({ schemaVersion: z.literal(1), items: z.array(StarredIdeaSchema).max(50) })
  .strict();

export const StoredCurrentRunSchema = z
  .object({ schemaVersion: z.literal(1), run: SpitballRunSchema })
  .strict();