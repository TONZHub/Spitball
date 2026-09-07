import type { z } from "zod";

import {
  DraftPortfolioResultSchema,
  FinalPortfolioResultSchema,
} from "./schemas";
import {
  buildDraftMessages,
  buildFinalMessages,
  buildRepairMessages,
  type ChatMessage,
} from "./prompts";
import type {
  DraftPortfolioResult,
  Duration,
  ExcludedIdea,
  FinalPortfolioResult,
  LandscapeSearchBundle,
  PortfolioRepository,
} from "@/types/spitball";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 90_000;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

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
): Promise<T> {
  const initialOutput = await requestCompletion(messages, options, 0.55);
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
  return requestValidatedJson(
    buildDraftMessages(input),
    DraftPortfolioResultSchema,
    options,
  );
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
