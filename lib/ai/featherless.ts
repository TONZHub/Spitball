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
const FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_OPENROUTER_CREATIVE_MODEL = "deepseek/deepseek-v4-flash-0731";
const DEFAULT_FEATHERLESS_CREATIVE_MODEL = "deepseek-ai/DeepSeek-V4-Flash-0731";
const DEFAULT_FEATHERLESS_BASE_MODEL = "zai-org/GLM-5.3-Flash";
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const IDEA_ORDER = ["safest", "stretch", "wildcard"] as const;

type FetchLike = typeof fetch;
type ModelPurpose = "base" | "creative";
type ProviderName = "openrouter" | "featherless";

type FeatherlessOptions = {
  apiKey?: string;
  model?: string;
  creativeModel?: string;
  featherlessApiKey?: string;
  featherlessModel?: string;
  featherlessCreativeModel?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

type ProviderRoute = {
  provider: ProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
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

function openRouterApiKey(options: FeatherlessOptions): string | undefined {
  return options.apiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim();
}

function featherlessApiKey(options: FeatherlessOptions): string | undefined {
  return options.featherlessApiKey?.trim() || process.env.FEATHERLESS_API_KEY?.trim();
}

function openRouterBaseModel(options: FeatherlessOptions): string | undefined {
  return options.model?.trim() || process.env.OPENROUTER_MODEL?.trim();
}

function openRouterCreativeModel(options: FeatherlessOptions): string {
  return (
    options.creativeModel?.trim() ||
    process.env.OPENROUTER_CREATIVE_MODEL?.trim() ||
    DEFAULT_OPENROUTER_CREATIVE_MODEL
  );
}

function featherlessBaseModel(options: FeatherlessOptions): string {
  return (
    options.featherlessModel?.trim() ||
    process.env.FEATHERLESS_MODEL?.trim() ||
    DEFAULT_FEATHERLESS_BASE_MODEL
  );
}

function featherlessCreativeModel(options: FeatherlessOptions): string {
  return (
    options.featherlessCreativeModel?.trim() ||
    process.env.FEATHERLESS_CREATIVE_MODEL?.trim() ||
    DEFAULT_FEATHERLESS_CREATIVE_MODEL
  );
}

function providerRoutes(options: FeatherlessOptions, purpose: ModelPurpose): ProviderRoute[] {
  const routes: ProviderRoute[] = [];
  const openRouterKey = openRouterApiKey(options);
  const featherlessKey = featherlessApiKey(options);

  if (purpose === "creative") {
    if (openRouterKey) {
      routes.push({
        provider: "openrouter",
        baseUrl: OPENROUTER_BASE_URL,
        apiKey: openRouterKey,
        model: openRouterCreativeModel(options),
      });
    }
    if (featherlessKey) {
      routes.push({
        provider: "featherless",
        baseUrl: FEATHERLESS_BASE_URL,
        apiKey: featherlessKey,
        model: featherlessCreativeModel(options),
      });
    }
  } else {
    const openRouterModel = openRouterBaseModel(options);
    if (openRouterKey && openRouterModel) {
      routes.push({
        provider: "openrouter",
        baseUrl: OPENROUTER_BASE_URL,
        apiKey: openRouterKey,
        model: openRouterModel,
      });
    }
    if (featherlessKey) {
      routes.push({
        provider: "featherless",
        baseUrl: FEATHERLESS_BASE_URL,
        apiKey: featherlessKey,
        model: featherlessBaseModel(options),
      });
    }
  }

  if (routes.length === 0) {
    throw new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      purpose === "creative"
        ? "No creative AI provider is configured for this deployment."
        : "No base AI provider is configured for this deployment.",
    );
  }

  return routes;
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

async function requestFromRoute(
  route: ProviderRoute,
  messages: ChatMessage[],
  options: FeatherlessOptions,
  temperature: number,
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const body: Record<string, unknown> = {
      model: route.model,
      messages,
      temperature,
      max_tokens: 8_000,
    };
    if (route.provider === "openrouter") {
      body.provider = { data_collection: "deny" };
    }

    const response = await fetchImpl(`${route.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${route.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://spitball.onrender.com",
        "X-Title": "Spitball",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      const retryable = RETRYABLE_STATUSES.has(response.status);
      throw new FeatherlessProviderError(
        "FEATHERLESS_UNAVAILABLE",
        `${route.provider} could not complete the request.`,
        { status: response.status, retryable },
      );
    }

    const responseText = await response.text();
    let responseBody: ChatCompletionResponse;
    try {
      responseBody = JSON.parse(responseText) as ChatCompletionResponse;
    } catch (error) {
      throw new FeatherlessProviderError(
        "FEATHERLESS_UNAVAILABLE",
        `${route.provider} returned a non-JSON API response.`,
        { retryable: true, cause: error },
      );
    }

    const content = responseBody.choices?.[0]?.message?.content;
    if (!content) {
      throw new FeatherlessProviderError(
        "FEATHERLESS_UNAVAILABLE",
        `${route.provider} returned an empty completion.`,
        { retryable: true },
      );
    }
    return content;
  } catch (error) {
    if (error instanceof FeatherlessProviderError) {
      throw error;
    }

    throw new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      `${route.provider} could not be reached.`,
      { retryable: true, cause: error },
    );
  }
}

async function requestCompletion(
  messages: ChatMessage[],
  options: FeatherlessOptions,
  temperature: number,
  purpose: ModelPurpose,
): Promise<string> {
  let lastRetryableError: FeatherlessProviderError | undefined;

  for (const route of providerRoutes(options, purpose)) {
    try {
      return await requestFromRoute(route, messages, options, temperature);
    } catch (error) {
      if (
        error instanceof FeatherlessProviderError &&
        error.code === "FEATHERLESS_UNAVAILABLE" &&
        error.retryable
      ) {
        lastRetryableError = error;
        continue;
      }
      throw error;
    }
  }

  throw (
    lastRetryableError ??
    new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      "The AI providers could not complete the request.",
      { retryable: true },
    )
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
  purpose: ModelPurpose = "base",
): Promise<T> {
  const initialOutput = await requestCompletion(messages, options, temperature, purpose);
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
    purpose,
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
    "base",
  );
  assertExtractionEvidence(extraction, input.repositories);

  const conceptMessages = buildConceptMessages({
    topic: input.topic,
    duration: input.duration,
    abstractCapabilities: extraction.abstractCapabilities,
  });

  let candidates: ConceptCandidateSet;
  try {
    // Creative model order: DeepSeek first, across OpenRouter then Featherless.
    candidates = await requestValidatedJson(
      conceptMessages,
      ConceptCandidateSetSchema,
      options,
      0.95,
      "creative",
    );
  } catch (error) {
    if (!(error instanceof FeatherlessProviderError)) {
      throw error;
    }

    // GLM 5.3 Flash second, again with OpenRouter -> Featherless provider failover.
    candidates = await requestValidatedJson(
      conceptMessages,
      ConceptCandidateSetSchema,
      options,
      0.8,
      "base",
    );
  }
  assertCandidateReferences(candidates, extraction, input.duration);

  const grounding = await requestValidatedJson(
    buildGroundingMessages({
      username: input.username,
      topic: input.topic,
      duration: input.duration,
      repositories: input.repositories,
      excludedIdeas: input.excludedIdeas,
      extraction,
      candidates,
    }),
    GroundingSelectionResultSchema,
    options,
    0.3,
    "base",
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
    0.55,
    "base",
  );
}