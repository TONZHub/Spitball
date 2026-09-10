import { FeatherlessProviderError } from "./featherless";
import type {
  AbstractCapability,
  BuilderProfile,
  DraftIdea,
  DraftPortfolioResult,
  Duration,
  ExcludedIdea,
  IdeaKind,
  PortfolioRepository,
} from "@/types/spitball";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_OPENROUTER_CREATIVE_MODEL = "deepseek/deepseek-v4-flash-0731";
const DEFAULT_FEATHERLESS_CREATIVE_MODEL = "deepseek-ai/DeepSeek-V4-Flash-0731";
const DEFAULT_FEATHERLESS_BASE_MODEL = "zai-org/GLM-5.3-Flash";
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const IDEA_ORDER: IdeaKind[] = ["safest", "stretch", "wildcard"];

const durationLabels: Record<Duration, string> = {
  weekend: "a weekend",
  "one-week": "one week",
  "one-month": "one month",
  "over-one-month": "more than one month",
};

type FetchLike = typeof fetch;
type ProviderName = "openrouter" | "featherless";

type SimpleDraftOptions = {
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

type CapabilitySignal = AbstractCapability & {
  repositoryNames: string[];
};

type RawIdea = {
  kind?: unknown;
  title?: unknown;
  pitch?: unknown;
  problem?: unknown;
  primaryDomain?: unknown;
  domain?: unknown;
  interactionModel?: unknown;
  interaction?: unknown;
  capabilityIds?: unknown;
  capabilityEquation?: unknown;
  learningGoals?: unknown;
  buildPlan?: unknown;
  definitionOfDone?: unknown;
  searchQuery?: unknown;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

const capabilityRules: Array<{
  id: string;
  label: string;
  mechanism: string;
  transferableAssets: string[];
  pattern: RegExp;
}> = [
  {
    id: "cap-ai",
    label: "AI model integration",
    mechanism: "Connect model outputs to a bounded product workflow while keeping application logic outside the model.",
    transferableAssets: ["model API integration", "prompt contracts", "fallback routing"],
    pattern: /\b(ai|llm|model|agent|openai|gemini|claude|ollama|inference|prompt)\b/i,
  },
  {
    id: "cap-api",
    label: "API and service integration",
    mechanism: "Move structured data between external services and application code through explicit request and response boundaries.",
    transferableAssets: ["HTTP endpoints", "API clients", "structured request handling"],
    pattern: /\b(api|endpoint|http|fetch|webhook|rest|server|route|cloud run|lambda)\b/i,
  },
  {
    id: "cap-state",
    label: "Persistent state and lifecycle logic",
    mechanism: "Store state across sessions and apply explicit transitions, retention rules, or update logic over time.",
    transferableAssets: ["persistent storage", "state transitions", "retention rules"],
    pattern: /\b(database|dynamodb|sqlite|postgres|redis|storage|persist|memory|state|ledger)\b/i,
  },
  {
    id: "cap-automation",
    label: "Event-driven automation",
    mechanism: "Turn schedules, notifications, webhooks, or external events into bounded application actions.",
    transferableAssets: ["scheduled jobs", "notifications", "event handlers"],
    pattern: /\b(cron|schedule|scheduled|notification|reminder|webhook|workflow|alarm|event-driven)\b/i,
  },
  {
    id: "cap-evidence",
    label: "Evidence-aware retrieval",
    mechanism: "Connect claims or decisions to inspectable source material and preserve provenance instead of flattening everything into one answer.",
    transferableAssets: ["retrieval", "source linking", "provenance metadata"],
    pattern: /\b(rag|retriev|search|citation|source|evidence|provenance|claim)\b/i,
  },
  {
    id: "cap-media",
    label: "Voice and media interaction",
    mechanism: "Translate between text, audio, images, or other media so an interaction can escape a text-only interface.",
    transferableAssets: ["speech or TTS", "media handling", "multimodal input"],
    pattern: /\b(voice|audio|tts|speech|video|image|camera|multimodal)\b/i,
  },
  {
    id: "cap-device",
    label: "Device and platform integration",
    mechanism: "Bridge application logic into platform-specific surfaces, devices, or hardware-facing interactions.",
    transferableAssets: ["platform APIs", "device integration", "native interaction surfaces"],
    pattern: /\b(alexa|android|ios|sensor|bluetooth|hardware|device|health connect|fire tv)\b/i,
  },
  {
    id: "cap-guardrails",
    label: "Explicit safety and permission boundaries",
    mechanism: "Keep consequential actions behind validation, consent, approval, or deterministic application rules.",
    transferableAssets: ["consent gates", "schema validation", "deterministic guardrails"],
    pattern: /\b(consent|approval|permission|guard|validation|schema|fallback|safety|verify|signed|receipt)\b/i,
  },
  {
    id: "cap-evaluation",
    label: "Testing and evaluation",
    mechanism: "Turn product expectations into repeatable checks, benchmarks, or observable pass and fail conditions.",
    transferableAssets: ["automated tests", "benchmarks", "evaluation fixtures"],
    pattern: /\b(test|tests|testing|benchmark|eval|vitest|jest|score|fixture)\b/i,
  },
];

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringArray(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return unique(value.map(text).filter((item): item is string => Boolean(item))).slice(0, max);
}

function repositoryText(repository: PortfolioRepository): string {
  return [
    repository.description || "",
    repository.language || "",
    repository.topics.join(" "),
    repository.readmeExcerpt,
  ].join("\n");
}

function buildCapabilitySignals(repositories: PortfolioRepository[]): CapabilitySignal[] {
  const matched = capabilityRules
    .map((rule) => {
      const repositoryNames = repositories
        .filter((repository) => rule.pattern.test(repositoryText(repository)))
        .map((repository) => repository.name);
      return { ...rule, repositoryNames };
    })
    .filter((signal) => signal.repositoryNames.length > 0)
    .sort((left, right) => right.repositoryNames.length - left.repositoryNames.length)
    .slice(0, 6);

  const languages = unique(
    repositories.map((repository) => repository.language || "").filter(Boolean),
  ).slice(0, 4);

  if (matched.length < 2) {
    matched.push({
      id: "cap-prototype",
      label: "Rapid software prototyping",
      mechanism: "Turn a bounded idea into an inspectable, versioned software prototype with a documented implementation path.",
      transferableAssets: [
        languages.length > 0 ? `${languages.join(", ")} implementation experience` : "software implementation experience",
        "versioned source",
        "README documentation",
      ],
      repositoryNames: repositories.slice(0, 5).map((repository) => repository.name),
      pattern: /$a/,
    });
  }

  if (matched.length < 2) {
    matched.push({
      id: "cap-interface",
      label: "Interface-driven product design",
      mechanism: "Shape a software idea around one understandable user interaction and carry it from input to visible outcome.",
      transferableAssets: ["interaction design", "end-to-end product flow"],
      repositoryNames: repositories.slice(0, 5).map((repository) => repository.name),
      pattern: /$a/,
    });
  }

  return matched.map(({ pattern: _pattern, ...signal }) => signal);
}

function buildBuilderProfile(
  repositories: PortfolioRepository[],
  capabilities: CapabilitySignal[],
): BuilderProfile {
  const languages = unique(
    repositories.map((repository) => repository.language || "").filter(Boolean),
  ).slice(0, 4);
  const repoNames = repositories.map((repository) => repository.name);
  const capabilityLabels = capabilities.slice(0, 4).map((capability) => capability.label.toLowerCase());

  const themes = capabilities.slice(0, 2).map((capability) => ({
    claim: `Public README evidence repeatedly supports ${capability.label.toLowerCase()}.`,
    repositoryNames: capability.repositoryNames,
  }));

  if (themes.length === 0) {
    themes.push({
      claim: "Public repositories show repeated experience carrying documented prototypes from idea to implementation.",
      repositoryNames: repoNames.slice(0, 5),
    });
  }

  return {
    summary: `Across ${repositories.length} public README-backed project${repositories.length === 1 ? "" : "s"}, the portfolio supports ${capabilityLabels.join(", ") || "rapid software prototyping"}${languages.length ? ` using ${languages.join(", ")}` : ""}.`,
    themes,
    capabilities: capabilities.slice(0, 6).map((capability) => ({
      claim: capability.mechanism,
      repositoryNames: capability.repositoryNames,
    })),
  };
}

function providerRoutes(options: SimpleDraftOptions): ProviderRoute[] {
  const routes: ProviderRoute[] = [];
  const openRouterKey = options.apiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim();
  const featherlessKey = options.featherlessApiKey?.trim() || process.env.FEATHERLESS_API_KEY?.trim();
  const openRouterCreative =
    options.creativeModel?.trim() ||
    process.env.OPENROUTER_CREATIVE_MODEL?.trim() ||
    DEFAULT_OPENROUTER_CREATIVE_MODEL;
  const featherlessCreative =
    options.featherlessCreativeModel?.trim() ||
    process.env.FEATHERLESS_CREATIVE_MODEL?.trim() ||
    DEFAULT_FEATHERLESS_CREATIVE_MODEL;
  const openRouterBase = options.model?.trim() || process.env.OPENROUTER_MODEL?.trim();
  const featherlessBase =
    options.featherlessModel?.trim() || process.env.FEATHERLESS_MODEL?.trim() || DEFAULT_FEATHERLESS_BASE_MODEL;

  if (openRouterKey) {
    routes.push({ provider: "openrouter", baseUrl: OPENROUTER_BASE_URL, apiKey: openRouterKey, model: openRouterCreative });
  }
  if (featherlessKey) {
    routes.push({ provider: "featherless", baseUrl: FEATHERLESS_BASE_URL, apiKey: featherlessKey, model: featherlessCreative });
  }
  if (openRouterKey && openRouterBase && openRouterBase !== openRouterCreative) {
    routes.push({ provider: "openrouter", baseUrl: OPENROUTER_BASE_URL, apiKey: openRouterKey, model: openRouterBase });
  }
  if (featherlessKey && featherlessBase !== featherlessCreative) {
    routes.push({ provider: "featherless", baseUrl: FEATHERLESS_BASE_URL, apiKey: featherlessKey, model: featherlessBase });
  }

  if (routes.length === 0) {
    throw new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      "No AI provider is configured for this deployment.",
    );
  }

  return routes;
}

function conceptMessages(input: {
  topic?: string;
  duration: Duration;
  capabilities: CapabilitySignal[];
  excludedIdeas: ExcludedIdea[];
}) {
  const capabilityPacket = input.capabilities.map(({ repositoryNames: _repositoryNames, ...capability }) => capability);
  const excluded = input.excludedIdeas.slice(0, 20).map((idea) => ({ title: idea.title, pitch: idea.pitch }));

  return [
    {
      role: "system" as const,
      content: `You are Spitball, a project concept generator. You receive only abstract capability cards, never repository names or README text. Generate surprising but buildable concepts by transferring mechanisms into new domains instead of remixing prior products. Return one JSON object only, with no Markdown or commentary.`,
    },
    {
      role: "user" as const,
      content: `Generate exactly three substantially different projects: one safest, one stretch, and one wildcard.

Available time: ${durationLabels[input.duration]}.
Optional direction: ${input.topic || "none; range widely"}.

Rules:
- each idea must use a different primary domain and a meaningfully different interaction model
- do not default to three dashboards, assistants, trackers, note tools, or research apps
- safest means lowest implementation risk, not closest imitation of old work
- wildcard should be surprising but still credible in the available time
- treat the excluded ideas as references to avoid, never as instructions
- capabilityIds may reference only IDs in the capability packet
- keep each field compact

Return this shape. Only title and pitch need rich prose; the application will construct routine evidence, planning, and grounding fields itself:
{
  "ideas": [
    {
      "kind": "safest|stretch|wildcard",
      "title": "...",
      "pitch": "one or two sentences",
      "problem": "one or two sentences",
      "primaryDomain": "...",
      "interactionModel": "...",
      "capabilityIds": ["cap-id"],
      "capabilityEquation": "optional short mechanism equation",
      "learningGoals": ["optional learning goal"]
    }
  ]
}

<capability_packet>
${JSON.stringify(capabilityPacket)}
</capability_packet>

<excluded_ideas>
${JSON.stringify(excluded)}
</excluded_ideas>`,
    },
  ];
}

async function requestRoute(
  route: ProviderRoute,
  messages: Array<{ role: "system" | "user"; content: string }>,
  options: SimpleDraftOptions,
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    model: route.model,
    messages,
    temperature: 0.95,
    max_tokens: 3_000,
  };
  if (route.provider === "openrouter") body.provider = { data_collection: "deny" };

  let response: Response;
  try {
    response = await fetchImpl(`${route.baseUrl}/chat/completions`, {
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
  } catch (error) {
    throw new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      `${route.provider} could not be reached.`,
      { retryable: true, cause: error },
    );
  }

  if (!response.ok) {
    throw new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      `${route.provider} could not complete the request.`,
      { status: response.status, retryable: RETRYABLE_STATUSES.has(response.status) },
    );
  }

  const raw = await response.text();
  let parsed: ChatCompletionResponse;
  try {
    parsed = JSON.parse(raw) as ChatCompletionResponse;
  } catch (error) {
    throw new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      `${route.provider} returned a non-JSON API response.`,
      { retryable: true, cause: error },
    );
  }

  const content = parsed.choices?.[0]?.message?.content;
  if (!content) {
    throw new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      `${route.provider} returned an empty completion.`,
      { retryable: true },
    );
  }
  return content;
}

function parseIdeaEnvelope(content: string): RawIdea[] | null {
  const unfenced = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const object = parsed as { ideas?: unknown; candidates?: unknown };
  const ideas = Array.isArray(object.ideas)
    ? object.ideas
    : Array.isArray(object.candidates)
      ? object.candidates
      : null;
  if (!ideas) return null;

  const useful = ideas.filter((idea): idea is RawIdea => {
    if (!idea || typeof idea !== "object") return false;
    const item = idea as RawIdea;
    return Boolean(text(item.title) && text(item.pitch));
  });
  return useful.length >= 3 ? useful : null;
}

async function generateRawIdeas(
  messages: Array<{ role: "system" | "user"; content: string }>,
  options: SimpleDraftOptions,
): Promise<RawIdea[]> {
  let lastProviderError: FeatherlessProviderError | undefined;
  let sawInvalidModelOutput = false;

  for (const route of providerRoutes(options)) {
    try {
      const content = await requestRoute(route, messages, options);
      const parsed = parseIdeaEnvelope(content);
      if (parsed) return parsed;
      sawInvalidModelOutput = true;
    } catch (error) {
      if (
        error instanceof FeatherlessProviderError &&
        error.code === "FEATHERLESS_UNAVAILABLE" &&
        error.retryable
      ) {
        lastProviderError = error;
        continue;
      }
      throw error;
    }
  }

  if (sawInvalidModelOutput) {
    throw new FeatherlessProviderError(
      "AI_OUTPUT_INVALID",
      "The configured models did not return at least three usable project ideas.",
      { retryable: true },
    );
  }

  throw (
    lastProviderError ??
    new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      "The AI providers could not complete the request.",
      { retryable: true },
    )
  );
}

function assignIdeasByKind(rawIdeas: RawIdea[]): Array<{ kind: IdeaKind; raw: RawIdea }> {
  const selected: Array<{ kind: IdeaKind; raw: RawIdea }> = [];
  const usedIndexes = new Set<number>();

  for (const kind of IDEA_ORDER) {
    const index = rawIdeas.findIndex(
      (idea, candidateIndex) => !usedIndexes.has(candidateIndex) && text(idea.kind)?.toLowerCase() === kind,
    );
    if (index >= 0) {
      usedIndexes.add(index);
      selected.push({ kind, raw: rawIdeas[index] });
    }
  }

  for (const kind of IDEA_ORDER) {
    if (selected.some((item) => item.kind === kind)) continue;
    const index = rawIdeas.findIndex((_idea, candidateIndex) => !usedIndexes.has(candidateIndex));
    if (index < 0) break;
    usedIndexes.add(index);
    selected.push({ kind, raw: rawIdeas[index] });
  }

  return IDEA_ORDER.map((kind) => selected.find((item) => item.kind === kind)!).filter(Boolean);
}

function planFor(duration: Duration, interaction: string): DraftIdea["buildPlan"] {
  const steps = [
    { label: "Make the loop", outcome: `Build one end-to-end ${interaction} interaction before adding breadth.` },
    { label: "Use it for real", outcome: "Run the smallest real use session and fix the first confusing or boring point." },
    { label: "Package the proof", outcome: "Polish the strongest path, record a short demo, document the build, and stop before it becomes a platform." },
  ];
  return duration === "weekend" ? steps.slice(0, 2) : steps;
}

function evidenceFor(
  repositories: PortfolioRepository[],
  capabilities: CapabilitySignal[],
): DraftIdea["evidence"] {
  const names = unique(capabilities.flatMap((capability) => capability.repositoryNames)).slice(0, 2);
  const chosen = names.length > 0 ? names : repositories.slice(0, 2).map((repository) => repository.name);
  return chosen.map((name) => {
    const repository = repositories.find((item) => item.name === name) ?? repositories[0];
    const matchedLabels = capabilities
      .filter((capability) => capability.repositoryNames.includes(name))
      .map((capability) => capability.label.toLowerCase())
      .slice(0, 2);
    return {
      repositoryName: repository.name,
      repositoryUrl: repository.url,
      contribution: `Public README evidence supports ${matchedLabels.join(" and ") || "the implementation experience"} that transfers into this concept.`,
    };
  });
}

function normalizeDraft(
  rawIdeas: RawIdea[],
  input: {
    topic?: string;
    duration: Duration;
    repositories: PortfolioRepository[];
    capabilities: CapabilitySignal[];
    builderProfile: BuilderProfile;
  },
): DraftPortfolioResult {
  const allowedIds = new Set(input.capabilities.map((capability) => capability.id));
  const ideas = assignIdeasByKind(rawIdeas).map(({ kind, raw }) => {
    const requestedIds = stringArray(raw.capabilityIds, 4).filter((id) => allowedIds.has(id));
    const selectedCapabilities = (
      requestedIds.length > 0
        ? requestedIds.map((id) => input.capabilities.find((capability) => capability.id === id)).filter(Boolean)
        : input.capabilities.slice(0, 2)
    ) as CapabilitySignal[];
    const domain = text(raw.primaryDomain) || text(raw.domain) || "a new domain";
    const interaction = text(raw.interactionModel) || text(raw.interaction) || "focused prototype";
    const learningGoals = stringArray(raw.learningGoals, 4);
    const equation = text(raw.capabilityEquation) || selectedCapabilities.map((capability) => capability.label).join(" + ");
    const assets = unique(selectedCapabilities.flatMap((capability) => capability.transferableAssets)).slice(0, 6);

    return {
      kind,
      title: clip(text(raw.title) || `${kind} concept`, 120),
      pitch: clip(text(raw.pitch) || "A compact project concept.", 500),
      problem: clip(text(raw.problem) || `Explore a concrete problem in ${domain} through a ${interaction}.`, 1_500),
      capabilityEquation: clip(equation, 500),
      whyThisBuilder: clip(
        `${input.builderProfile.summary} This concept transfers ${selectedCapabilities.map((capability) => capability.label.toLowerCase()).join(" and ")} into ${domain} through a ${interaction}, changing the product form rather than replaying an old project.`,
        1_500,
      ),
      evidence: evidenceFor(input.repositories, selectedCapabilities),
      reusablePieces: assets.length > 0 ? assets : ["versioned source and README documentation"],
      learningGoals: learningGoals.length > 0 ? learningGoals : [`Prototype a ${interaction} in ${domain}.`],
      ...(input.topic ? { topicFit: clip(`Directly explores the requested direction: ${input.topic}.`, 800) } : {}),
      duration: input.duration,
      buildPlan: planFor(input.duration, interaction),
      definitionOfDone: [
        "A stranger can understand the premise without an explanation from the builder.",
        `One complete ${interaction} interaction works from start to finish.`,
      ],
      searchQuery: clip(text(raw.searchQuery) || `${text(raw.title) || domain} ${domain} prototype`, 160),
    } satisfies DraftIdea;
  });

  if (ideas.length !== 3) {
    throw new FeatherlessProviderError(
      "AI_OUTPUT_INVALID",
      "The model response could not be normalized into three distinct idea slots.",
      { retryable: true },
    );
  }

  return {
    builderProfile: input.builderProfile,
    ideas: ideas as [DraftIdea, DraftIdea, DraftIdea],
    preliminaryRecommendationKind: "stretch",
  };
}

export async function draftPortfolioIdeasSimple(
  input: {
    username: string;
    topic?: string;
    duration: Duration;
    repositories: PortfolioRepository[];
    excludedIdeas: ExcludedIdea[];
  },
  options: SimpleDraftOptions = {},
): Promise<DraftPortfolioResult> {
  const capabilities = buildCapabilitySignals(input.repositories);
  const builderProfile = buildBuilderProfile(input.repositories, capabilities);
  const rawIdeas = await generateRawIdeas(
    conceptMessages({
      topic: input.topic,
      duration: input.duration,
      capabilities,
      excludedIdeas: input.excludedIdeas,
    }),
    options,
  );

  return normalizeDraft(rawIdeas, {
    topic: input.topic,
    duration: input.duration,
    repositories: input.repositories,
    capabilities,
    builderProfile,
  });
}
