# Spitball — Technical Spec

## Overview

Spitball will be a single full-stack Next.js application written in TypeScript and deployed as one Render web service. The browser provides the notebook interface and same-device idea storage. Server routes protect credentials and coordinate GitHub portfolio retrieval, Featherless inference, GitHub repository search, validation, and streamed progress.

The architecture deliberately avoids a database, user authentication, queues, separate frontend and backend deployments, and a second research provider. This keeps the proof of concept achievable in one intensive evening while satisfying every PRD epic.

The main request is a two-pass reasoning pipeline:

1. Fetch and normalize public GitHub portfolio evidence.
2. Ask Featherless for a builder profile, three draft ideas, and a GitHub search query for each idea.
3. Search GitHub for similar public projects.
4. Ask Featherless to incorporate the live search evidence, avoid starred ideas, verify feasibility and variety, and return the final structured batch.
5. Validate the result and stream it to the browser.

The UI generates Markdown deterministically from the validated result. The model does not control filenames, HTML, storage keys, or application behavior.

## Confirmed Technical Decisions

- Runtime and framework: Next.js App Router with TypeScript, running on Node.js.
- Hosting: one Render web service connected to a fresh GitHub repository.
- AI provider: Featherless through its OpenAI-compatible chat-completions API.
- Preferred model: `Qwen/Qwen3-235B-A22B-Instruct-2507` if it appears in the user's Featherless model catalog.
- Model fallback policy: select the strongest available non-reasoning Qwen instruct model with at least a 64K context window and set its exact ID through `FEATHERLESS_MODEL`.
- Evidence source: public GitHub repository metadata and README text only.
- Landscape source: GitHub repository search only for the MVP.
- GitHub authentication: one server-side, read-only token owned by the Spitball deployment; visitors do not authenticate.
- README limit: up to 10,000 normalized characters per eligible repository.
- Repository limit: up to 25 recently updated eligible repositories.
- Portfolio text safety ceiling: 200,000 normalized README characters per run, plus repository metadata.
- Output: structured JSON validated on the server, rendered as cards and deterministic Markdown in the browser.
- Persistence: browser `localStorage`, capped at 50 starred ideas, with no cross-device claim.
- Progress transport: newline-delimited JSON streamed from one POST request.
- AI repair policy: one automatic structured-output repair attempt per model pass; a second failure ends the run.

## Stack

### Application

- **Next.js App Router** — pages, layouts, server route, and production server in one project.
- **React** — interactive form, streamed progress, idea cards, previews, and dialogs.
- **TypeScript** — shared contracts between the route, AI validation, storage, and components.
- **Plain CSS with CSS custom properties** — notebook styling without a component-system dependency.
- **`next/font`** — locally served display and body fonts selected during implementation.

### Data and validation

- **Zod** — request validation, Featherless response validation, streamed-event contracts, and stored-data migration guards.
- **Browser Web Storage** — latest-run and starred-idea persistence.
- **Native `fetch` and Web Streams APIs** — GitHub, Featherless, and NDJSON progress; no additional HTTP client.

### Markdown

- **`react-markdown`** — render the deterministic Markdown document preview.
- **Native `Blob` and object URLs** — download `.md` files without a server-side file store.

### Quality checks

- **ESLint** — static linting from the framework scaffold.
- **TypeScript compiler** — build-time contract verification.
- **Vitest** — focused unit tests for pure portfolio, storage, validation, similarity, and Markdown helpers.
- **React Testing Library** — only where a component behavior needs more confidence than a pure-function test.

Package versions will be resolved and committed in the lockfile when the application is scaffolded. The spec avoids unverified future version numbers.

## Architecture

### 1. Browser Application Shell

Implements: `prd.md > Epic 1`, `Epic 2`, `Epic 3`, `Epic 4`, `Epic 5`, and `Epic 6`.

The browser renders three primary routes:

- `/` — input form, scan progress, builder profile, and current three-card batch.
- `/idea/[ideaId]` — full idea Markdown preview and download action.
- `/starred` — persistent starred-idea notebook and confirmed removal.

The shell keeps only presentation and local persistence responsibilities. It never receives `FEATHERLESS_API_KEY` or `GITHUB_TOKEN`.

The latest successful run is stored locally so navigating to an idea and returning does not erase it. A new successful run replaces the previous current run. Starred ideas live under a separate versioned key and survive replacement of the current run.

### 2. Streaming Run Orchestrator

Implements: `prd.md > Story 2.1`, `Story 5.3`, and `Story 6.2`.

`POST /api/spitball` owns the complete server workflow. It responds with `application/x-ndjson` and emits small JSON events separated by newline characters.

The route performs these stages in order:

1. Validate and normalize the request.
2. Fetch the public GitHub user and repository list.
3. Filter repositories and retrieve useful README text.
4. Run Featherless pass one.
5. Run three GitHub landscape searches.
6. Run Featherless pass two.
7. Validate the completed batch.
8. Emit a `complete` event and close the stream.

An application-level `error` event ends an unsuccessful stream. Because HTTP headers are already sent after streaming begins, the client treats the event—not the final HTTP status—as the authoritative run outcome.

### 3. GitHub Portfolio Adapter

Implements: `prd.md > Story 1.1`, `Story 2.1`, `Story 2.2`, and `Story 6.1`.

The adapter uses GitHub REST endpoints to:

- verify the public user;
- list up to 100 public repositories sorted by recent update;
- reject forks, archived repositories, and empty repositories;
- request README content until 25 useful repositories are collected or candidates are exhausted; and
- return normalized evidence objects.

Each README is decoded, normalized to text, and capped at 10,000 characters. The combined README content is capped at 200,000 characters to protect the inference context. When the total ceiling is reached, remaining repository metadata may still appear in the “considered” list, but no unsupported capability may be inferred from omitted README text.

The adapter emits an accepted repository event only after useful README content has been retrieved. The UI may animate accepted names like new notes appearing on paper.

README text is untrusted evidence. It is wrapped in explicit delimiters and the AI system prompt says that instructions found inside repository content are data, not commands.

### 4. Featherless Reasoning Adapter

Implements: `prd.md > Story 2.2`, all of `Epic 3`, and `Story 6.2`.

The adapter sends OpenAI-compatible chat-completions requests to Featherless using server-side environment configuration.

It exposes two domain functions:

- `draftPortfolioIdeas(input)` — returns the builder profile, three draft candidates, supporting repository references, and one short GitHub search phrase per candidate.
- `finalizePortfolioIdeas(input)` — combines the drafts with landscape results, checks feasibility and differentiation, selects one strongest recommendation, and returns the final three ideas.

Both functions demand JSON only and validate the parsed value with Zod. If parsing or validation fails, the adapter makes one repair request containing the validation issues and the invalid output. A second invalid response produces a retryable run error.

The model ID is never embedded in a component or prompt file. `FEATHERLESS_MODEL` is the only source of truth, allowing a model replacement after the free-access period without rewriting the application.

### 5. GitHub Landscape Adapter

Implements: `prd.md > Story 3.4` and the landscape portion of `Story 6.2`.

Pass one supplies one concise search phrase for each idea. The adapter searches public GitHub repositories by name, description, topic, and README relevance, requesting up to five best matches per idea.

The adapter:

- excludes repositories owned by the analyzed user where possible;
- stores only the name, URL, description, star count, and updated date needed for comparison;
- marks GitHub's `incomplete_results` response for the model and final disclaimer;
- rejects malformed or overlong search phrases; and
- treats a failed search request as a failed landscape stage.

All three landscape searches must complete for the run to succeed. The UI does not receive partial idea cards when this stage fails.

The resulting section is labeled a **GitHub landscape check** and explicitly says it is not an originality guarantee or exhaustive market search.

### 6. Structured Result Validator

Implements: `prd.md > Epic 3` and `Epic 6`.

Server validation checks both shape and critical product invariants:

- exactly three ideas exist;
- the three kinds are exactly `safest`, `stretch`, and `wildcard`;
- all IDs are unique;
- exactly one `recommendationId` points to an existing idea;
- each idea cites at least one portfolio repository;
- each idea includes a completed landscape section;
- each idea includes at least one learning goal and one plan step;
- the selected duration is carried into each idea;
- search URLs use HTTPS GitHub URLs; and
- strings and arrays remain below defined size limits.

The final Featherless prompt also asks the model to compare candidates against the supplied starred summaries and against one another. A small deterministic similarity guard compares normalized titles and keyword sets. If it finds a clear collision, the server uses the single repair allowance to request a replacement before failing the run.

### 7. Local Persistence Adapter

Implements: `prd.md > Epic 5`.

The browser stores two versioned documents:

- `spitball.current-run.v1` — the latest completed run.
- `spitball.starred.v1` — up to 50 complete starred `Idea` objects plus save timestamps.

All reads pass through Zod `safeParse`. Invalid or obsolete values are ignored safely rather than crashing the page.

Starring is immediate when fewer than 50 unique ideas are stored. A duplicate ID does not create another copy. At 50 ideas, the action is blocked with a message explaining that the notebook is full and an older star must be removed first.

Unstarring always opens a confirmation dialog naming the idea. Only confirmation writes the updated collection.

For rerolls, the browser sends compact summaries of starred ideas—not all Markdown content—to the server. Each summary contains only the ID, title, pitch, category, and capability equation needed for duplicate avoidance.

### 8. Markdown Artifact Builder

Implements: `prd.md > Epic 4`.

The artifact builder receives one validated `SpitballIdea` and produces Markdown in a fixed order. The same generated string is used for preview and download, preventing divergence.

The builder owns:

- heading order;
- labels and disclaimer text;
- GitHub evidence links;
- landscape links;
- plan formatting;
- safe filename generation; and
- UTF-8 `.md` download creation.

The Featherless response supplies content fields, not raw executable HTML. `react-markdown` renders without enabling raw HTML.

### 9. Notebook Presentation Layer

Implements: the feel requirements across all PRD epics.

The visual system uses CSS custom properties for paper, ink, pencil, red correction marks, and star accents. Reusable primitives provide rough borders, tape corners, underlines, and scribbled stage labels.

Accessibility constraints remain stronger than the motif:

- standard body copy uses a readable font;
- the scratchy display font is limited to headings and labels;
- interactive elements have visible keyboard focus;
- motion respects `prefers-reduced-motion`;
- sound is off by default and may be omitted entirely from the first build; and
- color is never the only signal for recommendation, progress, star state, or error.

## File Structure

```text
spitball/
├── app/
│   ├── api/
│   │   └── spitball/
│   │       └── route.ts              # Streaming POST orchestrator and NDJSON response
│   ├── idea/
│   │   └── [ideaId]/
│   │       └── page.tsx               # Client-side lookup and Markdown idea preview
│   ├── starred/
│   │   └── page.tsx                   # Starred notebook, empty state, removal flow
│   ├── globals.css                    # Paper palette, typography, motion, rough UI primitives
│   ├── layout.tsx                     # Fonts, metadata, shared notebook navigation
│   └── page.tsx                       # Input, progress stream, profile, and current idea batch
├── components/
│   ├── BuilderProfile.tsx             # Evidence-grounded portfolio reflection
│   ├── ConfirmDialog.tsx              # Accessible confirmation before unstar
│   ├── IdeaCard.tsx                   # Category, pitch, equation, recommendation, star
│   ├── IdeaMarkdown.tsx               # Deterministic Markdown preview surface
│   ├── NotebookNav.tsx                # Home and Starred Ideas navigation
│   ├── ScanProgress.tsx               # Streaming repository and stage scribbles
│   ├── SpitballForm.tsx               # Username, topic, duration, submit and retry state
│   ├── StarButton.tsx                 # Save, full-capacity, and confirmed-remove behavior
│   └── StarredList.tsx                # Stored idea collection and empty state
├── lib/
│   ├── ai/
│   │   ├── featherless.ts             # API client, timeout, parse, and repair request
│   │   ├── prompts.ts                 # Pass-one, pass-two, and repair instructions
│   │   └── schemas.ts                 # Zod contracts for draft and final AI output
│   ├── github/
│   │   ├── client.ts                  # Authenticated GitHub fetch wrapper and error mapping
│   │   ├── landscape.ts               # Three public repository searches and normalization
│   │   └── portfolio.ts               # User lookup, filtering, README decoding and limits
│   ├── markdown.ts                    # Idea-to-Markdown and safe filename functions
│   ├── similarity.ts                  # Lightweight duplicate guards for titles and keywords
│   ├── storage.ts                     # Versioned current-run and starred localStorage access
│   ├── stream-client.ts               # Browser NDJSON decoder and event dispatch
│   └── stream-server.ts               # Server helpers for encoding progress and error events
├── types/
│   └── spitball.ts                    # Shared request, event, profile, idea, and run types
├── public/
│   └── scribbles/                     # Small original SVG marks used by the notebook theme
├── tests/
│   ├── github-portfolio.test.ts       # Eligibility, ordering, README and total character caps
│   ├── markdown.test.ts               # Required sections and safe filenames
│   ├── schemas.test.ts                # Final-result invariant fixtures
│   ├── similarity.test.ts             # Obvious duplicate and distinct-idea cases
│   └── storage.test.ts                # Persistence, deduplication, 50-star limit and corruption
├── .env.example                       # Required variable names with no secrets
├── .gitignore                         # Environment files, build output and local tooling
├── .node-version                      # Runtime version shared by local work and Render
├── next.config.ts                     # Minimal Next.js production configuration
├── package.json                       # Commands and pinned dependency ranges
├── package-lock.json                  # Reproducible dependency resolution
├── README.md                          # Setup, environment, privacy boundary and demo instructions
└── tsconfig.json                      # Strict TypeScript configuration
```

## Data Contracts

### Run Request

```ts
type Duration = "weekend" | "one-week" | "one-month" | "over-one-month";

type SpitballRequest = {
  username: string;
  topic?: string;
  duration: Duration;
  excludedIdeas: Array<{
    id: string;
    title: string;
    pitch: string;
    kind: "safest" | "stretch" | "wildcard";
    capabilityEquation: string;
  }>;
};
```

Server limits:

- username: GitHub-compatible characters, maximum 39 characters;
- topic: trimmed, maximum 200 characters;
- excluded ideas: maximum 50;
- excluded-idea strings: individually capped before entering a prompt; and
- unknown fields: rejected or stripped by the request schema.

### Stream Events

```ts
type StreamEvent =
  | { type: "run_started"; runId: string }
  | { type: "stage"; stage: "portfolio" | "ideation" | "landscape" | "finalizing" }
  | { type: "repository"; name: string; url: string }
  | { type: "complete"; result: SpitballRun }
  | {
      type: "error";
      code: RunErrorCode;
      message: string;
      retryable: boolean;
    };
```

Each event is serialized as one compact JSON line. The client buffers incomplete text chunks until a newline arrives, validates each decoded event, and ignores no malformed event silently. A malformed stream becomes a retryable application error.

### Portfolio Evidence

```ts
type PortfolioRepository = {
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
```

### Completed Run

```ts
type SpitballRun = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  input: {
    username: string;
    topic?: string;
    duration: Duration;
  };
  portfolio: {
    consideredCount: number;
    analyzedRepositories: Array<Pick<PortfolioRepository, "name" | "url">>;
    evidenceLevel: "limited" | "standard";
  };
  builderProfile: {
    summary: string;
    themes: EvidenceClaim[];
    capabilities: EvidenceClaim[];
  };
  ideas: [SpitballIdea, SpitballIdea, SpitballIdea];
  recommendationId: string;
};

type EvidenceClaim = {
  claim: string;
  repositoryNames: string[];
};
```

### Completed Idea

```ts
type SpitballIdea = {
  id: string;
  kind: "safest" | "stretch" | "wildcard";
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
  duration: Duration;
  buildPlan: Array<{
    label: string;
    outcome: string;
  }>;
  definitionOfDone: string[];
  landscape: {
    scope: "github-repositories";
    similarProjects: Array<{
      name: string;
      url: string;
      description: string;
      similarity: string;
    }>;
    differentiator: string;
    disclaimer: string;
    incompleteSearch: boolean;
  };
  recommendationReason?: string;
};
```

## Data Flow

### Primary run lifecycle

1. The user loads `/`.
2. `page.tsx` reads `spitball.current-run.v1` and `spitball.starred.v1` through `storage.ts`.
3. The user submits username, optional topic, and duration.
4. The browser reduces starred ideas to the compact `excludedIdeas` contract.
5. The browser posts the request to `/api/spitball` and begins decoding NDJSON.
6. The server validates the request and emits `run_started` plus the `portfolio` stage.
7. `portfolio.ts` verifies the GitHub user, lists repositories, filters candidates, retrieves README content, and emits each accepted repository.
8. The server constructs a delimited evidence packet containing metadata and normalized README excerpts.
9. `draftPortfolioIdeas()` returns and validates a builder profile, three drafts, and three landscape queries.
10. The server emits the `landscape` stage.
11. `landscape.ts` performs the three searches and returns normalized public matches.
12. `finalizePortfolioIdeas()` receives the evidence, drafts, landscape results, duration, topic, and excluded starred summaries.
13. The final result validator enforces all product invariants and the duplicate guard.
14. The server emits `complete` with the `SpitballRun` and closes the stream.
15. The browser writes the run to `spitball.current-run.v1` only after the complete event validates.
16. The page reveals the builder profile, then the three idea cards.

No partial run is written to persistent browser storage.

### Retry lifecycle

1. Any stage maps internal failure to a safe `RunErrorCode` and participant-facing message.
2. The server emits one `error` event and closes the stream.
3. The client preserves the last submitted form values and all stars.
4. **Try Again** resubmits the same request.
5. **Edit Inputs** returns focus to the existing filled form.

### Star lifecycle

1. The user stars an idea from a card or preview.
2. `storage.ts` reads and validates the current starred collection.
3. If the ID exists, no duplicate is created.
4. If 50 unique stars already exist, the write is blocked and the full-notebook message appears.
5. Otherwise the full structured idea and `savedAt` time are appended.
6. The same storage event updates the current page and `/starred` view.
7. Unstarring opens `ConfirmDialog`; only confirmation removes and rewrites the collection.

### Markdown lifecycle

1. `/idea/[ideaId]` searches the current run, then the starred collection, for the requested ID.
2. If found, `markdown.ts` turns the validated object into one fixed Markdown string.
3. `IdeaMarkdown` renders that string.
4. Download creates a UTF-8 Markdown `Blob`, attaches a temporary object URL to a download action, and revokes the URL afterward.
5. If the ID does not exist locally, the page explains that the idea is unavailable on this device and offers navigation home or to Starred Ideas.

## Components And Responsibilities

### `SpitballForm`

Implements: `prd.md > Epic 1` and `Story 6.1`.

- Owns draft input values and inline validation.
- Shows One Week as the default duration.
- Explains the public-README privacy boundary.
- Prevents duplicate submission during an active run.
- Preserves values after failures and exposes retry/edit actions.

### `ScanProgress`

Implements: `prd.md > Story 2.1`.

- Receives parsed stream events.
- Shows the current stage in plain language.
- Adds accepted repository names as scribbled notes.
- Uses an `aria-live` summary without announcing every decorative animation.
- Honors reduced-motion preferences.

### `BuilderProfile`

Implements: `prd.md > Story 2.2`.

- Appears before ideas.
- Renders themes and capabilities with repository citations.
- Shows Limited Evidence when appropriate.
- Does not attempt to derive claims independently in the browser.

### `IdeaCard`

Implements: `prd.md > Story 3.1`, `Story 3.2`, `Story 3.3`, and `Story 5.1`.

- Renders the category, pitch, capability equation, and duration.
- Shows recommendation state using text and visual treatment.
- Links to the full idea route.
- Delegates persistence to `StarButton`.

### `StarButton` and `ConfirmDialog`

Implements: `prd.md > Story 5.1` and `Story 5.2`.

- Stars immediately when capacity allows.
- Explains the 50-idea cap.
- Opens an accessible named confirmation dialog for removal.
- Keeps card and preview state synchronized through shared storage helpers.

### `IdeaMarkdown`

Implements: `prd.md > Epic 4`.

- Renders deterministic Markdown.
- Provides the `.md` download.
- Displays the GitHub landscape scope and originality disclaimer.
- Never enables raw model-supplied HTML.

### `StarredList`

Implements: `prd.md > Story 5.2`.

- Lists saved ideas in save-time order, newest first.
- Opens the full document for each idea.
- Handles confirmed removal.
- Provides the empty state and route back to `/`.

### `/api/spitball`

Implements: all server-dependent stories, especially `Story 2.1`, `Epic 3`, and `Story 6.2`.

- Protects all provider secrets.
- Coordinates the pipeline and progress stream.
- Applies timeouts, validation, repair, and safe error mapping.
- Emits no completed result until every required stage succeeds.

## External APIs And Dependencies

### Featherless API

- Purpose: portfolio reflection, capability recombination, search-query creation, landscape interpretation, final recommendation, and structured repair.
- Authentication: `FEATHERLESS_API_KEY` server environment variable.
- Model: `FEATHERLESS_MODEL` server environment variable.
- Base URL: `https://api.featherless.ai/v1`.
- Interface: OpenAI-compatible chat completions.
- Documentation: [Featherless documentation](https://docs.featherless.ai/).
- Failure rule: retry transient transport failure once; use one output-repair attempt for invalid JSON; then fail the run cleanly.

### GitHub REST API

- Purpose: public user lookup, public repository listing, README retrieval, and repository landscape search.
- Authentication: server-side `GITHUB_TOKEN` with the minimum access needed for public resources.
- API version header: pin the current supported GitHub REST version during implementation rather than relying on an implicit default.
- Documentation:
  - [List repositories for a user](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user)
  - [Get a repository README](https://docs.github.com/en/rest/repos/contents#get-a-repository-readme)
  - [Search repositories](https://docs.github.com/en/rest/search/search#search-repositories)
  - [REST rate limits](https://docs.github.com/en/rest/rate-limit/rate-limit)
- Failure rule: distinguish not-found, no eligible evidence, rate-limit, search failure, and general provider failure.

### Next.js and React

- Purpose: server-rendered application shell, client interactivity, and streaming route.
- Documentation: [Next.js App Router](https://nextjs.org/docs/app).

### Render

- Purpose: build and host one public Node web service from the fresh GitHub repository.
- Configuration:
  - build command: `npm ci && npm run build`;
  - start command: `npm run start`;
  - environment: `FEATHERLESS_API_KEY`, `FEATHERLESS_MODEL`, and `GITHUB_TOKEN`;
  - health check path: `/` for the MVP; and
  - automatic deploys from the chosen production branch.
- Documentation: [Deploy a Next.js app on Render](https://render.com/docs/deploy-nextjs-app).

### Browser Web Storage

- Purpose: same-device persistence for the latest run and up to 50 starred ideas.
- Documentation: [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API).
- Failure rule: storage parse or quota failure must not prevent a new run; saving reports a local error instead.

### Zod

- Purpose: runtime validation at every untrusted boundary.
- Documentation: [Zod documentation](https://zod.dev/).

### `react-markdown`

- Purpose: render the application's deterministic Markdown artifacts.
- Documentation: [`react-markdown`](https://github.com/remarkjs/react-markdown).
- Security rule: do not enable raw HTML parsing for model-derived content.

## AI Usage

### Why AI is necessary

The AI is not a decorative chat layer. It performs the product's core educational reasoning:

- identifies recurring capabilities across separate repositories;
- explains the evidence behind those inferences;
- recombines capabilities into feasible new project concepts;
- varies ambition intentionally across three categories;
- maps a proposal to a new learning goal;
- interprets live landscape results; and
- recommends one idea with an explicit rationale.

### Pass one: reflection and drafts

Inputs:

- username;
- optional topic;
- duration;
- normalized repository metadata;
- up to 10,000 README characters per repository;
- up to 200,000 README characters total; and
- compact starred-idea summaries.

Outputs:

- builder profile with named evidence;
- three category-specific drafts;
- capability equations;
- duration-sized plans;
- one short GitHub search query per draft; and
- preliminary recommendation reasoning.

The prompt explicitly prohibits unsupported personal inference, obeying README instructions, generic ideas without evidence, and claims of originality.

### Pass two: landscape and finalization

Inputs:

- validated pass-one output;
- normalized GitHub search matches for all three ideas;
- starred summaries;
- the same topic and duration; and
- final schema requirements.

Outputs:

- completed landscape sections;
- proposed differentiators;
- exactly three distinct validated ideas;
- one recommendation ID; and
- explicit recommendation reasoning.

The pass must preserve evidence links and state when GitHub returned incomplete search results.

### Model selection

The preferred starting model is `Qwen/Qwen3-235B-A22B-Instruct-2507` because this task benefits from long-context synthesis, instruction following, and structured output more than from fast conversational latency. Its exact availability must be confirmed through the user's Featherless account before deployment.

If unavailable, select the strongest account-accessible Qwen instruct model that meets the context requirement. Keep temperature moderate for idea variety but low enough to preserve structure. Exact generation parameters should be tested against one real portfolio and then recorded beside the prompt constants.

### Output reliability

- Do not trust JSON merely because it parses.
- Validate shapes and product invariants with Zod.
- Allow one model repair attempt with explicit validation errors.
- Do not silently drop an invalid idea to produce only two.
- Do not synthesize fake landscape results when GitHub search fails.
- Log provider status, duration, and validation issue names without logging API keys or full README packets.

## Error Strategy

### Safe error codes

```ts
type RunErrorCode =
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
```

Only safe participant-facing messages reach the UI. Server logs may include a request ID, provider status code, stage, duration, and validation-path summary. They must not include provider tokens, complete prompts, or full README content.

### Timeouts and retry boundaries

- GitHub request: bounded timeout and one retry only for a transient network or server failure.
- Featherless request: longer bounded timeout and one retry only for a transient transport or server failure.
- Invalid model output: one repair request, not repeated blind retries.
- GitHub landscape failure: no partial results; emit `LANDSCAPE_FAILED`.
- Browser stream interruption: retain inputs and expose Try Again.

Retries must not multiply into an uncontrolled retry tree. A single run has a known upper bound.

## Security And Privacy

- `FEATHERLESS_API_KEY` and `GITHUB_TOKEN` exist only in Render environment variables and server code.
- No secret uses a `NEXT_PUBLIC_` prefix.
- `.env*` files remain gitignored; `.env.example` contains names only.
- Request fields and AI response fields have length limits.
- README content is treated as untrusted, delimited evidence to reduce prompt-injection risk.
- URLs are validated before rendering as links.
- Raw HTML from repository or model content is never rendered.
- The app analyzes only public data and states that clearly.
- Starred ideas remain in the user's browser; they are not sent to a Spitball database because no database exists.
- Compact starred summaries are sent with a reroll only to prevent duplicates.
- Server logs avoid complete portfolio and prompt bodies.

## Risks And Verification

### Risk 1: Portfolio payload overwhelms the selected model

Mitigation:

- cap each README at 10,000 characters;
- cap combined README content at 200,000 characters;
- normalize whitespace and strip non-content noise;
- require a model with at least the planned context capacity; and
- test with a real 25-repository portfolio before visual polish.

Verification:

- unit-test per-file and aggregate caps;
- log character and estimated-token counts without logging content; and
- complete a live run at the maximum repository count.

### Risk 2: AI returns plausible but unsupported capability claims

Mitigation:

- give every repository a stable evidence name and URL;
- require repository references for every claim;
- validate references against the analyzed repository set; and
- prohibit unsupported personal claims in both passes.

Verification:

- test a small known portfolio by hand;
- confirm every displayed evidence link exists in the analyzed set; and
- include an adversarial README fixture containing prompt-like instructions.

### Risk 3: Three ideas are cosmetic variations

Mitigation:

- encode category goals separately in the prompt;
- compare normalized titles and keywords;
- pass starred summaries into both reasoning passes; and
- use the repair allowance to replace a collision.

Verification:

- reroll twice with at least three existing stars;
- confirm new outputs do not repeat the same problem/pitch; and
- record the visible distinctions among Safest, Stretch, and Wild Card.

### Risk 4: Landscape results are weak or misleading

Mitigation:

- call the feature a GitHub landscape check;
- link directly to every cited repository;
- expose incomplete-search status;
- use descriptions as evidence rather than inventing product details; and
- fail rather than silently skip the stage.

Verification:

- manually open every comparison link in the demo run;
- simulate a GitHub search failure and confirm no incomplete batch appears; and
- confirm the disclaimer appears in cards or previews where differentiation is discussed.

### Risk 5: Streaming works locally but fails through deployment

Mitigation:

- use standard fetch-readable streams and NDJSON;
- send small events promptly;
- avoid assuming chunk boundaries match lines;
- validate buffering logic with split-line tests; and
- test on the Render URL before completing notebook polish.

Verification:

- confirm repository names appear progressively on Render;
- simulate an error after at least one progress event;
- confirm the UI transitions to retry without storing partial output.

### Risk 6: Local starred storage is corrupted or full

Mitigation:

- version stored documents;
- validate every read;
- cap stars at 50;
- handle storage write exceptions; and
- keep new generation independent of storage health.

Verification:

- inject malformed JSON into both storage keys;
- add 50 fixture ideas and test the full state;
- confirm removal asks before writing; and
- reopen the browser and confirm persistence.

### Required automated checks

- repository eligibility and sort order;
- 25-repository maximum;
- 10,000-character per-README maximum;
- 200,000-character aggregate maximum;
- Zod rejection of missing or extra idea categories;
- recommendation ID integrity;
- repository evidence-link integrity;
- title and keyword duplicate guard;
- safe Markdown filename generation;
- deterministic required Markdown sections;
- storage version validation and corruption recovery;
- 50-star maximum; and
- NDJSON decoding across arbitrary chunk boundaries.

### Required build checks

```text
npm run lint
npm run test
npm run build
```

All three must pass locally before deployment and after any dependency or configuration change that affects the production build.

## Deployment

### Render web service

The fresh GitHub repository is connected to one Render web service.

Required environment variables:

```text
FEATHERLESS_API_KEY=<secret>
FEATHERLESS_MODEL=<confirmed model ID>
GITHUB_TOKEN=<read-only server token>
```

Deployment sequence:

1. Push the scaffold and lockfile to the fresh repository.
2. Create the Render Node web service.
3. Configure `npm ci && npm run build` as the build command.
4. Configure `npm run start` as the start command.
5. Add all three secrets in Render, never in GitHub.
6. Deploy and verify `/` loads.
7. Run one small portfolio through the live URL.
8. Run the intended demo portfolio through the live URL.
9. Confirm stream progress, star persistence, reroll avoidance, preview, and download.

The README will document setup without containing live credentials.

## Demo And Submission Flow

### Intended live demonstration

1. Load the public Render URL on the notebook cover.
2. Enter a real GitHub username.
3. Enter `education` as optional topic and select One Week.
4. Start the run and show real repository names appearing as scribbled notes.
5. Reveal the builder profile and point to named evidence.
6. Reveal Safest Bet, Interesting Stretch, and Wild Card.
7. Emphasize the A+B+C capability equation and strongest recommendation.
8. Open the recommended Markdown document.
9. Show the learning goal, GitHub landscape links, differentiator, and one-week plan.
10. Download the Markdown file.
11. Star the idea.
12. Spitball Again and show that the star remains while the next batch avoids repeating it.

### Demo preparation requirements

- Choose a public portfolio that reliably produces at least five eligible repositories.
- Run it shortly before recording to verify all comparison links.
- Keep one completed run and at least one starred idea stored in the demo browser as recovery material.
- Record a successful backup walkthrough in case a live provider is slow.
- Never claim the GitHub landscape check covers the entire web.
- Show the educational value explicitly: prior capability, new skill, and achievable plan.

### Submission evidence to capture

- opening notebook form;
- repository scan in progress;
- evidence-grounded builder profile;
- all three labeled idea cards;
- strongest recommendation and A+B+C equation;
- landscape links and disclaimer;
- Markdown preview and downloaded file;
- Starred Ideas page; and
- preserved star after a reroll.

These screenshots and clips collectively prove the PRD's educational impact, creative AI use, technical execution, and pitch clarity.
