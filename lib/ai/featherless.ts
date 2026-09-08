import type { z } from "zod";

import {
  CapabilityExtractionResultSchema,
  ConceptCandidateSetSchema,
  DraftPortfolioResultSchema,
  FinalPortfolioResultSchema,
  GroundingSelectionResultSchema,
} from "./schemas";
import {
  buildCapabilityExtractionMessages,
  buildConceptMessages,
  buildFinalMessages,
  buildGroundingMessages,
  buildRepairMessages,
  type ChatMessage,
} from "./prompts";
import type {
  CapabilityExtractionResult,
  ConceptCandidateSet,
  DraftPortfolioResult,
  Duration,
  ExcludedIdea,
  FinalPortfolioResult,
  GroundingSelectionResult,
  LandscapeSearchBundle,
  PortfolioRepository,
} from "@/types/spitball";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 90_000;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const IDEA_ORDER = ["safest", "stretch", "wildcard"] as const;

type FetchLike = typeof fetch;

type FeatherlessOptions = {
  apiKey?: string;
  model?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export class FeatherlessProviderError extends Error {
  readonly code: "FEATHERLESS_UNAVAILABLE" | "AI_OUTPUT_INVALID";
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    code: "FEATHERLESS_UNAVAILABLE" | "AI_OUTPUT_INVALID",
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "FeatherlessProviderError";
    this.code = code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

function readConfig(options: FeatherlessOptions): { apiKey: string; model: string } {
  const apiKey =
    options.apiKey?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.FEATHERLESS_API_KEY?.trim();
  const model =
    options.model?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    process.env.FEATHERLESS_MODEL?.trim();

  if (!apiKey || !model) {
    throw new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      "The AI provider is not configured for this deployment.",
    );
  }
  return { apiKey, model };
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(unfenced);
  } catch (error) {
    throw new FeatherlessProviderError("AI_OUTPUT_INVALID", "The model returned invalid JSON.", {
      retryable: true,
      cause: error,
    });
  }
}

async function requestCompletion(
  messages: ChatMessage[],
  options: FeatherlessOptions,
  temperature: number,
): Promise<string> {
  const { apiKey, model } = readConfig(options);
  const fetchImpl = options.fetchImpl ?? fetch;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://spitball.onrender.com",
          "X-Title": "Spitball",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 8_000,
          provider: {
            data_collection: "deny",
          },
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!response.ok) {
        const retryable = RETRYABLE_STATUSES.has(response.status);
        if (attempt === 0 && retryable) continue;
        throw new FeatherlessProviderError(
          "FEATHERLESS_UNAVAILABLE",
          "The AI provider could not complete the request.",
          { status: response.status, retryable },
        );
      }

      const body = (await response.json()) as ChatCompletionResponse;
      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        throw new FeatherlessProviderError(
          "AI_OUTPUT_INVALID",
          "The model returned an empty response.",
          { retryable: true },
        );
      }
      return content;
    } catch (error) {
      if (error instanceof FeatherlessProviderError) throw error;
      if (attempt === 0) continue;
      throw new FeatherlessProviderError(
        "FEATHERLESS_UNAVAILABLE",
        "The AI provider could not be reached. Try again.",
        { retryable: true, cause: error },
      );
    }
  }

  throw new FeatherlessProviderError(
    "FEATHERLESS_UNAVAILABLE",
    "The AI provider could not complete the request.",
    { retryable: true },
  );
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`);
}

async function requestValidatedJson<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  options: FeatherlessOptions,
  temperature = 0.55,
): Promise<T> {
  const initialOutput = await requestCompletion(messages, options, temperature);
  let parsed: unknown;
  let issues: string[];

  try {
    parsed = extractJson(initialOutput);
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    issues = formatIssues(result.error);
  } catch (error) {
    issues = [error instanceof Error ? error.message : "Output was not valid JSON"];
  }

  const repairOutput = await requestCompletion(
    buildRepairMessages(messages, initialOutput, issues),
    options,
    0.1,
  );
  try {
    parsed = extractJson(repairOutput);
    const repaired = schema.safeParse(parsed);
    if (repaired.success) return repaired.data;
    issues = formatIssues(repaired.error);
  } catch (error) {
    issues = [error instanceof Error ? error.message : "Repaired output was not valid JSON"];
  }

  throw new FeatherlessProviderError(
    "AI_OUTPUT_INVALID",
    `The model output remained invalid after one repair: ${issues[0]}`,
    { retryable: true },
  );
}

function invalidGrounding(message: string): never {
  throw new FeatherlessProviderError("AI_OUTPUT_INVALID", message, { retryable: true });
}

function assertExtractionEvidence(
  extraction: CapabilityExtractionResult,
  repositories: PortfolioRepository[],
): void {
  const repositoryNames = new Set(repositories.map((repository) => repository.name));
  for (const claims of [extraction.builderProfile.themes, extraction.builderProfile.capabilities]) {
    for (const claim of claims) {
      if (claim.repositoryNames.some((name) => !repositoryNames.has(name))) {
        invalidGrounding("The capability extraction cited a repository outside the analyzed portfolio.");
      }
    }
  }
}

function assertCandidateReferences(
  candidates: ConceptCandidateSet,
  extraction: CapabilityExtractionResult,
  duration: Duration,
): void {
  const capabilityIds = new Set(extraction.abstractCapabilities.map((capability) => capability.id));
  for (const candidate of candidates.candidates) {
    if (candidate.duration !== duration) {
      invalidGrounding("An isolated candidate changed the requested build duration.");
    }
    if (candidate.capabilityIds.some((id) => !capabilityIds.has(id))) {
      invalidGrounding("An isolated candidate referenced an unknown abstract capability.");
    }
  }
}

function assembleDraft(
  extraction: CapabilityExtractionResult,
  candidates: ConceptCandidateSet,
  grounding: GroundingSelectionResult,
  repositories: PortfolioRepository[],
): DraftPortfolioResult {
  const candidateById = new Map(candidates.candidates.map((candidate) => [candidate.id, candidate]));
  const repositoryByName = new Map(repositories.map((repository) => [repository.name, repository.url]));

  const orderedSelections = IDEA_ORDER.map((kind) => {
    const selection = grounding.selections.find((item) => item.kind === kind);
    if (!selection) invalidGrounding(`Grounding did not select a ${kind} candidate.`);
    return selection;
  });

  const ideas = orderedSelections.map((selection) => {
    const candidate = candidateById.get(selection.sourceCandidateId);
    if (!candidate) {
      invalidGrounding("Grounding selected a candidate that was not generated in the isolated pass.");
    }
    if (candidate.kind !== selection.kind) {
      invalidGrounding("Grounding changed a candidate's idea kind.");
    }

    for (const evidence of selection.evidence) {
      if (repositoryByName.get(evidence.repositoryName) !== evidence.repositoryUrl) {
        invalidGrounding("Grounding cited repository evidence outside the analyzed portfolio.");
      }
    }

    return {
      kind: candidate.kind,
      title: candidate.title,
      pitch: candidate.pitch,
      problem: candidate.problem,
      capabilityEquation: candidate.capabilityEquation,
      whyThisBuilder: selection.whyThisBuilder,
      evidence: selection.evidence,
      reusablePieces: selection.reusablePieces,
      learningGoals: candidate.learningGoals,
      ...(selection.topicFit ? { topicFit: selection.topicFit } : {}),
      duration: candidate.duration,
      buildPlan: candidate.buildPlan,
      definitionOfDone: candidate.definitionOfDone,
      searchQuery: candidate.searchQuery,
    };
  });

  const result = DraftPortfolioResultSchema.safeParse({
    builderProfile: extraction.builderProfile,
    ideas,
    preliminaryRecommendationKind: grounding.preliminaryRecommendationKind,
  });

  if (!result.success) {
    invalidGrounding(`The staged draft failed final validation: ${formatIssues(result.error)[0]}`);
  }
  return result.data;
}

export async function draftPortfolioIdeas(
  input: {
    username: string;
    topic?: string;
    duration: Duration;
    repositories: PortfolioRepository[];
    excludedIdeas: ExcludedIdea[];
  },
  options: FeatherlessOptions = {},
): Promise<DraftPortfolioResult> {
  const extraction = await requestValidatedJson(
    buildCapabilityExtractionMessages({ repositories: input.repositories }),
    CapabilityExtractionResultSchema,
    options,
    0.25,
  );
  assertExtractionEvidence(extraction, input.repositories);

  const candidates = await requestValidatedJson(
    buildConceptMessages({
      topic: input.topic,
      duration: input.duration,
      abstractCapabilities: extraction.abstractCapabilities,
      excludedIdeas: input.excludedIdeas,
    }),
    ConceptCandidateSetSchema,
    options,
    0.8,
  );
  assertCandidateReferences(candidates, extraction, input.duration);

  const grounding = await requestValidatedJson(
    buildGroundingMessages({
      username: input.username,
      topic: input.topic,
      duration: input.duration,
      repositories: input.repositories,
      extraction,
      candidates,
    }),
    GroundingSelectionResultSchema,
    options,
    0.3,
  );

  return assembleDraft(extraction, candidates, grounding, input.repositories);
}

export async function finalizePortfolioIdeas(
  input: {
    username: string;
    topic?: string;
    duration: Duration;
    repositories: PortfolioRepository[];
    excludedIdeas: ExcludedIdea[];
    draft: DraftPortfolioResult;
    landscapes: LandscapeSearchBundle[];
  },
  options: FeatherlessOptions = {},
): Promise<FinalPortfolioResult> {
  return requestValidatedJson(
    buildFinalMessages(input),
    FinalPortfolioResultSchema,
    options,
  );
}
