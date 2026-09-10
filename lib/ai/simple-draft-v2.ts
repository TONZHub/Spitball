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
const DEFAULT_OPENROUTER_BASE_MODEL = "z-ai/glm-5.3-flash";
const DEFAULT_FEATHERLESS_CREATIVE_MODEL = "deepseek-ai/DeepSeek-V4-Flash-0731";
const DEFAULT_FEATHERLESS_BASE_MODEL = "unsloth/Qwen3.8-27B";
const IDEA_ORDER: IdeaKind[] = ["safest", "stretch", "wildcard"];

const durationLabels: Record<Duration, string> = {
  weekend: "a weekend",
  "one-week": "one week",
  "one-month": "one month",
  "over-one-month": "more than one month",
};

type FetchLike = typeof fetch;
type ProviderName = "openrouter" | "featherless";

type Options = {
  apiKey?: string;
  model?: string;
  creativeModel?: string;
  featherlessApiKey?: string;
  featherlessModel?: string;
  featherlessCreativeModel?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

type Route = {
  provider: ProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
};

type CapabilitySignal = AbstractCapability & { repositoryNames: string[] };
type RawIdea = Record<string, unknown>;
type Completion = { choices?: Array<{ message?: { content?: string | null } }> };

const capabilityRules = [
  ["cap-ai", "AI model integration", "Connect model output to bounded application logic without giving the model ownership of the whole workflow.", ["model APIs", "prompt contracts", "fallback routing"], /\b(ai|llm|model|agent|openai|gemini|claude|ollama|inference|prompt)\b/i],
  ["cap-api", "API and service integration", "Move structured data across explicit service boundaries and handle external responses in application code.", ["HTTP endpoints", "API clients", "structured requests"], /\b(api|endpoint|http|fetch|webhook|rest|server|route|cloud run|lambda)\b/i],
  ["cap-state", "Persistent state and lifecycle logic", "Keep state across sessions and apply explicit transitions, retention, or update rules over time.", ["persistent storage", "state transitions", "retention rules"], /\b(database|dynamodb|sqlite|postgres|redis|storage|persist|memory|state|ledger)\b/i],
  ["cap-automation", "Event-driven automation", "Turn schedules, notifications, webhooks, or outside events into bounded application actions.", ["scheduled jobs", "notifications", "event handlers"], /\b(cron|schedule|scheduled|notification|reminder|webhook|workflow|alarm|event-driven)\b/i],
  ["cap-evidence", "Evidence-aware retrieval", "Connect claims or decisions to inspectable source material instead of flattening provenance away.", ["retrieval", "source linking", "provenance metadata"], /\b(rag|retriev|search|citation|source|evidence|provenance|claim)\b/i],
  ["cap-media", "Voice and media interaction", "Translate between text, audio, images, or other media so the interaction can leave a text-only surface.", ["speech or TTS", "media handling", "multimodal input"], /\b(voice|audio|tts|speech|video|image|camera|multimodal)\b/i],
  ["cap-device", "Device and platform integration", "Bridge application logic into platform-specific surfaces, devices, or hardware-facing interactions.", ["platform APIs", "device integration", "native surfaces"], /\b(alexa|android|ios|sensor|bluetooth|hardware|device|health connect|fire tv)\b/i],
  ["cap-guardrails", "Explicit safety and permission boundaries", "Keep consequential actions behind validation, consent, approval, or deterministic rules.", ["consent gates", "schema validation", "deterministic guardrails"], /\b(consent|approval|permission|guard|validation|schema|fallback|safety|verify|signed|receipt)\b/i],
] as const;

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function cleanText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function stringArray(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return unique(value.map(cleanText).filter((item): item is string => Boolean(item))).slice(0, max);
}

function repositoryText(repository: PortfolioRepository): string {
  return [repository.description || "", repository.language || "", repository.topics.join(" "), repository.readmeExcerpt].join("\n");
}

function capabilitiesFor(repositories: PortfolioRepository[]): CapabilitySignal[] {
  const matches: CapabilitySignal[] = capabilityRules
    .map(([id, label, mechanism, transferableAssets, pattern]) => ({
      id,
      label,
      mechanism,
      transferableAssets: [...transferableAssets],
      repositoryNames: repositories.filter((repository) => pattern.test(repositoryText(repository))).map((repository) => repository.name),
    }))
    .filter((capability) => capability.repositoryNames.length > 0)
    .sort((a, b) => b.repositoryNames.length - a.repositoryNames.length)
    .slice(0, 6);

  if (matches.length < 2) {
    matches.push({
      id: "cap-prototype",
      label: "Rapid software prototyping",
      mechanism: "Turn a bounded idea into a working, inspectable software prototype with a documented implementation path.",
      transferableAssets: ["software implementation", "versioned source", "README documentation"],
      repositoryNames: repositories.slice(0, 5).map((repository) => repository.name),
    });
  }
  if (matches.length < 2) {
    matches.push({
      id: "cap-interface",
      label: "Interface-driven product design",
      mechanism: "Shape an idea around one understandable user interaction and carry it from input to visible outcome.",
      transferableAssets: ["interaction design", "end-to-end product flow"],
      repositoryNames: repositories.slice(0, 5).map((repository) => repository.name),
    });
  }
  return matches;
}

function builderProfile(repositories: PortfolioRepository[], capabilities: CapabilitySignal[]): BuilderProfile {
  const languages = unique(repositories.map((repository) => repository.language || "")).slice(0, 4);
  const labels = capabilities.slice(0, 4).map((capability) => capability.label.toLowerCase());
  return {
    summary: `Across ${repositories.length} public README-backed project${repositories.length === 1 ? "" : "s"}, the portfolio supports ${labels.join(", ")}${languages.length ? ` using ${languages.join(", ")}` : ""}.`,
    themes: capabilities.slice(0, 2).map((capability) => ({
      claim: `Public README evidence repeatedly supports ${capability.label.toLowerCase()}.`,
      repositoryNames: capability.repositoryNames,
    })),
    capabilities: capabilities.map((capability) => ({ claim: capability.mechanism, repositoryNames: capability.repositoryNames })),
  };
}

function routes(options: Options): Route[] {
  const featherlessKey = options.featherlessApiKey?.trim() || process.env.FEATHERLESS_API_KEY?.trim();
  const openRouterKey = options.apiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim();
  const result: Route[] = [];

  if (featherlessKey) {
    result.push({
      provider: "featherless",
      baseUrl: FEATHERLESS_BASE_URL,
      apiKey: featherlessKey,
      model: options.featherlessCreativeModel?.trim() || process.env.FEATHERLESS_CREATIVE_MODEL?.trim() || DEFAULT_FEATHERLESS_CREATIVE_MODEL,
    });
    result.push({
      provider: "featherless",
      baseUrl: FEATHERLESS_BASE_URL,
      apiKey: featherlessKey,
      model: options.featherlessModel?.trim() || process.env.FEATHERLESS_MODEL?.trim() || DEFAULT_FEATHERLESS_BASE_MODEL,
    });
  }

  if (openRouterKey) {
    result.push({
      provider: "openrouter",
      baseUrl: OPENROUTER_BASE_URL,
      apiKey: openRouterKey,
      model: options.creativeModel?.trim() || process.env.OPENROUTER_CREATIVE_MODEL?.trim() || DEFAULT_OPENROUTER_CREATIVE_MODEL,
    });
    result.push({
      provider: "openrouter",
      baseUrl: OPENROUTER_BASE_URL,
      apiKey: openRouterKey,
      model: options.model?.trim() || process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_BASE_MODEL,
    });
  }

  const deduped = result.filter((route, index, all) => all.findIndex((candidate) => candidate.provider === route.provider && candidate.model === route.model) === index);
  if (!deduped.length) {
    throw new FeatherlessProviderError("FEATHERLESS_UNAVAILABLE", "No AI provider is configured for this deployment.", { retryable: false });
  }
  return deduped;
}

function messages(input: { topic?: string; duration: Duration; capabilities: CapabilitySignal[]; excludedIdeas: ExcludedIdea[] }) {
  const packet = input.capabilities.map(({ repositoryNames: _names, ...capability }) => capability);
  const excluded = input.excludedIdeas.slice(0, 20).map(({ title, pitch }) => ({ title, pitch }));
  return [
    {
      role: "system" as const,
      content: "You are Spitball, a project concept generator. You receive abstract capability cards but never repository names or README text. Transfer mechanisms into genuinely different domains instead of remixing prior products. Return JSON only.",
    },
    {
      role: "user" as const,
      content: `Generate exactly three substantially different projects: one safest, one stretch, and one wildcard.\n\nAvailable time: ${durationLabels[input.duration]}.\nOptional direction: ${input.topic || "none; range widely"}.\n\nUse different domains and interaction models. Avoid three dashboards, assistants, trackers, notes apps, or research tools. Safest means low implementation risk, not imitation. Wildcard should surprise while remaining credible. Only title and pitch require polished prose.\n\nReturn {"ideas":[{"kind":"safest|stretch|wildcard","title":"...","pitch":"...","problem":"...","primaryDomain":"...","interactionModel":"...","capabilityIds":["cap-id"],"learningGoals":["..."]}]}.\n\n<capabilities>${JSON.stringify(packet)}</capabilities>\n<excluded>${JSON.stringify(excluded)}</excluded>`,
    },
  ];
}

async function requestRoute(route: Route, prompt: ReturnType<typeof messages>, options: Options): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${route.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${route.apiKey}`,
        "Content-Type": "application/json",
        ...(route.provider === "openrouter"
          ? { "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://spitball.onrender.com", "X-Title": "Spitball" }
          : {}),
      },
      body: JSON.stringify({ model: route.model, messages: prompt, temperature: 0.95, max_tokens: 2200 }),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new FeatherlessProviderError("FEATHERLESS_UNAVAILABLE", `${route.provider}/${route.model}: network or timeout failure`, { retryable: true, cause: error });
  }

  const raw = await response.text();
  if (!response.ok) {
    let detail = "";
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } | string; message?: string };
      detail = typeof parsed.error === "string" ? parsed.error : parsed.error?.message || parsed.message || "";
    } catch {
      detail = raw.slice(0, 160);
    }
    throw new FeatherlessProviderError(
      "FEATHERLESS_UNAVAILABLE",
      `${route.provider}/${route.model}: HTTP ${response.status}${detail ? ` — ${clip(detail, 160)}` : ""}`,
      { status: response.status, retryable: true },
    );
  }

  let parsed: Completion;
  try {
    parsed = JSON.parse(raw) as Completion;
  } catch (error) {
    throw new FeatherlessProviderError("FEATHERLESS_UNAVAILABLE", `${route.provider}/${route.model}: non-JSON API response`, { retryable: true, cause: error });
  }
  const content = parsed.choices?.[0]?.message?.content;
  if (!content) {
    throw new FeatherlessProviderError("FEATHERLESS_UNAVAILABLE", `${route.provider}/${route.model}: empty completion`, { retryable: true });
  }
  return content;
}

function parseIdeas(content: string): RawIdea[] | null {
  const stripped = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;
  try {
    const parsed = JSON.parse(candidate) as { ideas?: unknown; candidates?: unknown };
    const ideas = Array.isArray(parsed.ideas) ? parsed.ideas : Array.isArray(parsed.candidates) ? parsed.candidates : null;
    if (!ideas) return null;
    const useful = ideas.filter((idea): idea is RawIdea => Boolean(idea && typeof idea === "object" && cleanText((idea as RawIdea).title) && cleanText((idea as RawIdea).pitch)));
    return useful.length >= 3 ? useful : null;
  } catch {
    return null;
  }
}

async function generate(prompt: ReturnType<typeof messages>, options: Options): Promise<RawIdea[]> {
  const failures: string[] = [];
  for (const route of routes(options)) {
    try {
      const content = await requestRoute(route, prompt, options);
      const parsed = parseIdeas(content);
      if (parsed) return parsed;
      failures.push(`${route.provider}/${route.model}: returned unusable idea JSON`);
    } catch (error) {
      if (error instanceof FeatherlessProviderError) {
        failures.push(error.message);
        continue;
      }
      failures.push(`${route.provider}/${route.model}: unexpected failure`);
    }
  }
  throw new FeatherlessProviderError(
    "FEATHERLESS_UNAVAILABLE",
    `All configured AI routes failed. ${failures.join(" | ")}`,
    { retryable: true },
  );
}

function pickByKind(rawIdeas: RawIdea[]): Array<{ kind: IdeaKind; raw: RawIdea }> {
  const unused = rawIdeas.slice();
  return IDEA_ORDER.map((kind) => {
    const index = unused.findIndex((idea) => cleanText(idea.kind)?.toLowerCase() === kind);
    const raw = index >= 0 ? unused.splice(index, 1)[0] : unused.shift()!;
    return { kind, raw };
  });
}

function evidence(repositories: PortfolioRepository[], capabilities: CapabilitySignal[]): DraftIdea["evidence"] {
  const names = unique(capabilities.flatMap((capability) => capability.repositoryNames)).slice(0, 2);
  return (names.length ? names : repositories.slice(0, 2).map((repository) => repository.name)).map((name) => {
    const repository = repositories.find((item) => item.name === name) || repositories[0];
    const labels = capabilities.filter((capability) => capability.repositoryNames.includes(name)).map((capability) => capability.label.toLowerCase()).slice(0, 2);
    return { repositoryName: repository.name, repositoryUrl: repository.url, contribution: `Public README evidence supports ${labels.join(" and ") || "the implementation experience"} that transfers into this concept.` };
  });
}

function normalize(rawIdeas: RawIdea[], input: { topic?: string; duration: Duration; repositories: PortfolioRepository[]; capabilities: CapabilitySignal[]; profile: BuilderProfile }): DraftPortfolioResult {
  const allowed = new Set(input.capabilities.map((capability) => capability.id));
  const ideas = pickByKind(rawIdeas).map(({ kind, raw }) => {
    const requested = stringArray(raw.capabilityIds, 4).filter((id) => allowed.has(id));
    const selected = (requested.length ? requested.map((id) => input.capabilities.find((capability) => capability.id === id)).filter(Boolean) : input.capabilities.slice(0, 2)) as CapabilitySignal[];
    const domain = cleanText(raw.primaryDomain) || cleanText(raw.domain) || "a new domain";
    const interaction = cleanText(raw.interactionModel) || cleanText(raw.interaction) || "focused prototype";
    const assets = unique(selected.flatMap((capability) => capability.transferableAssets)).slice(0, 6);
    return {
      kind,
      title: clip(cleanText(raw.title) || `${kind} concept`, 120),
      pitch: clip(cleanText(raw.pitch) || "A compact project concept.", 500),
      problem: clip(cleanText(raw.problem) || `Explore a concrete problem in ${domain} through a ${interaction}.`, 1500),
      capabilityEquation: clip(cleanText(raw.capabilityEquation) || selected.map((capability) => capability.label).join(" + "), 500),
      whyThisBuilder: clip(`${input.profile.summary} This concept transfers ${selected.map((capability) => capability.label.toLowerCase()).join(" and ")} into ${domain} through a ${interaction}.`, 1500),
      evidence: evidence(input.repositories, selected),
      reusablePieces: assets.length ? assets : ["versioned source and README documentation"],
      learningGoals: stringArray(raw.learningGoals, 4).length ? stringArray(raw.learningGoals, 4) : [`Prototype a ${interaction} in ${domain}.`],
      ...(input.topic ? { topicFit: clip(`Directly explores the requested direction: ${input.topic}.`, 800) } : {}),
      duration: input.duration,
      buildPlan: [
        { label: "Make the loop", outcome: `Build one end-to-end ${interaction} interaction before adding breadth.` },
        { label: "Use it for real", outcome: "Run the smallest real use session and fix the first confusing or boring point." },
        { label: "Package the proof", outcome: "Polish the strongest path, record a short demo, document the build, and stop before it becomes a platform." },
      ],
      definitionOfDone: ["A stranger can understand the premise without an explanation from the builder.", `One complete ${interaction} interaction works from start to finish.`],
      searchQuery: clip(cleanText(raw.searchQuery) || `${cleanText(raw.title) || domain} ${domain} prototype`, 160),
    } satisfies DraftIdea;
  });
  return { builderProfile: input.profile, ideas: ideas as [DraftIdea, DraftIdea, DraftIdea], preliminaryRecommendationKind: "stretch" };
}

export async function draftPortfolioIdeasSimpleV2(
  input: { username: string; topic?: string; duration: Duration; repositories: PortfolioRepository[]; excludedIdeas: ExcludedIdea[] },
  options: Options = {},
): Promise<DraftPortfolioResult> {
  const capabilities = capabilitiesFor(input.repositories);
  const profile = builderProfile(input.repositories, capabilities);
  const rawIdeas = await generate(messages({ topic: input.topic, duration: input.duration, capabilities, excludedIdeas: input.excludedIdeas }), options);
  return normalize(rawIdeas, { topic: input.topic, duration: input.duration, repositories: input.repositories, capabilities, profile });
}
