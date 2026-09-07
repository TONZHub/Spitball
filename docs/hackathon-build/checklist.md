# Spitball Build Checklist

## Build Preferences

- **Plan ownership:** Codex designs and sequences the plan; Zoe reviews the finished checklist.
- **Build mode:** Autonomous. Once the build starts, Codex executes the checklist in order without re-asking routine implementation choices.
- **Comprehension checks:** N/A during autonomous execution.
- **Git:** Initialize local Git if needed and commit after every completed checklist item, using the item number and title as the commit message. Never include secrets.
- **Verification:** Required at every item. An item is not complete until its stated check passes or a blocker is recorded.
- **Visual pauses:** Stop for Zoe after Item 5, when the first real portfolio produces final ideas, and after Item 9, when the complete notebook experience is visible.
- **Check-in cadence:** Only at the two visual pauses, at a genuine user-controlled blocker such as credentials or Render connection, and at final handoff.
- **Scope rule:** Preserve the one-evening MVP. Optional sound, Notion, authentication, private repositories, and extra ornamentation cannot delay Items 1–12.
- **Target effort:** Twelve focused items, approximately 15–30 minutes each before user-controlled deployment steps.
- **Hero proof:** The A+B+C portfolio recombination is the submission's primary wow moment.

## Checklist

- [x] **1. Establish the runnable project shell — 20 minutes**
  Spec ref: `spec.md > Stack` and `spec.md > File Structure`
  What to build: Create the Next.js App Router and TypeScript project in the existing project root without removing `.devpost-hackathon-state.json` or `docs/hackathon-build/`. Add the planned dependencies, strict configuration, `.node-version`, `.env.example`, scripts for lint/test/build, base routes, and an initial local Git commit. Use a lockfile and keep all real secrets ignored.
  Acceptance: The home, idea, and starred routes load as intentional placeholders; no account flow exists; `.env.example` names `FEATHERLESS_API_KEY`, `FEATHERLESS_MODEL`, and `GITHUB_TOKEN` without values.
  Verify: Run `npm run lint`, `npm run test`, and `npm run build`; inspect `git status` and confirm no environment file or secret is tracked.

- [x] **2. Define contracts and deterministic core helpers — 25 minutes**
  Spec ref: `spec.md > Data Contracts`, `spec.md > Structured Result Validator`, and `spec.md > Markdown Artifact Builder`
  What to build: Implement shared TypeScript and Zod contracts for requests, stream events, portfolio evidence, completed runs, and ideas. Add pure helpers for final-result invariants, title/keyword similarity, safe filenames, and deterministic Markdown generation. Create fixtures for one valid run and representative invalid outputs.
  Acceptance: Validation requires exactly Safest Bet, Interesting Stretch, and Wild Card; exactly one valid recommendation; supported repository evidence; completed landscape data; learning goals; duration plans; and safe bounded strings. Markdown always contains the promised pitch, evidence, reusable pieces, landscape, differentiator, learning goals, plan, definition of done, and disclaimer.
  Verify: Run focused Vitest suites for schemas, similarity, and Markdown, then run `npm run test` and `npm run build`.

- [x] **3. Prove public GitHub portfolio ingestion — 30 minutes**
  Spec ref: `spec.md > GitHub Portfolio Adapter` and `spec.md > Risk 1: Portfolio payload overwhelms the selected model`
  What to build: Add the authenticated GitHub fetch wrapper and portfolio adapter. Verify users, list recently updated public repositories, exclude forks/archived/empty repositories, fetch useful README files until 25 are accepted, normalize text, cap each README at 10,000 characters, and cap the aggregate at 200,000 characters. Treat README instructions as untrusted text and map not-found, empty-portfolio, rate-limit, and provider failures to safe codes.
  Acceptance: A real public username returns only eligible evidence in recent-update order; one or two repositories produce Limited Evidence metadata; an account with no eligible README content does not receive generic ideas; caps and truncation flags are correct.
  Verify: Run mocked adapter tests covering every filter and cap, then execute a server-only smoke script against one known public username and inspect repository names, counts, lengths, and URLs without printing README bodies.

- [ ] **4. Prove Featherless structured reasoning — 30 minutes**
  Spec ref: `spec.md > Featherless Reasoning Adapter`, `spec.md > AI Usage`, and `spec.md > Output reliability`
  What to build: Implement the Featherless chat-completions client, model configuration, timeouts, safe logging, pass-one prompt, pass-two prompt, JSON extraction, Zod validation, and one repair attempt. Confirm the best available Qwen instruct model in Zoe's Featherless catalog and record its exact ID only in the local/Render environment, never source. Include repository-evidence constraints, prompt-injection boundaries, duration behavior, category distinctions, starred-idea avoidance, and originality disclaimers in the prompts.
  Acceptance: A live pass-one fixture yields a supported builder profile, three distinct category drafts, capability equations, duration-sized plans, and three short search queries. Invalid structured output receives exactly one repair attempt; a second invalid response fails safely.
  Verify: Run mocked provider tests and a live server-only Featherless smoke command with a small sanitized portfolio fixture; validate the response through the production Zod schema and inspect no secret or full prompt in logs.

- [ ] **5. Complete the real two-pass idea pipeline — 30 minutes**
  Spec ref: `spec.md > GitHub Landscape Adapter`, `spec.md > Primary run lifecycle`, and `spec.md > Risk 3` through `Risk 4`
  What to build: Implement three GitHub repository landscape searches from pass-one queries, normalize up to five matches per idea, exclude the analyzed user's repositories, preserve incomplete-search status, and feed the results into Featherless pass two. Assemble and validate one final `SpitballRun`, including duplicate checks against the three ideas and supplied starred summaries.
  Acceptance: One real portfolio produces exactly three distinct ideas, one strongest recommendation, linked evidence, A+B+C capability equations, complete GitHub landscape sections, differentiators, learning goals, and plans sized to the chosen duration. Any failed landscape search fails the batch instead of returning partial ideas.
  Verify: Run the complete server-only pipeline for the intended demo username with a topic and One Week duration; manually open its repository evidence and landscape links. Save a sanitized JSON fixture for UI development. **Visual pause 1:** show Zoe the first real builder profile and three final ideas before continuing.

- [ ] **6. Stream real progress through the API — 25 minutes**
  Spec ref: `spec.md > Streaming Run Orchestrator`, `spec.md > Stream Events`, and `spec.md > Retry lifecycle`
  What to build: Implement `POST /api/spitball` as a Node runtime NDJSON stream. Emit run, stage, accepted-repository, complete, and safe error events. Add the browser stream decoder with arbitrary chunk buffering, event validation, cancellation cleanup, and conversion of malformed/interrupted streams into retryable UI errors.
  Acceptance: Repository events reflect accepted README evidence; completion arrives only after both Featherless passes and all three searches succeed; partial output is never stored; an error event preserves request inputs and all stars.
  Verify: Unit-test newline splitting across fragmented chunks, test an error after progress has begun, and use the browser network panel to confirm a local request emits progressive events before the completed run.

- [ ] **7. Build the complete input-to-results journey — 30 minutes**
  Spec ref: `spec.md > Browser Application Shell`, `spec.md > SpitballForm`, `spec.md > ScanProgress`, `spec.md > BuilderProfile`, and `spec.md > IdeaCard`
  What to build: Replace placeholders on `/` with the required username, optional topic, four duration options, One Week default, privacy note, primary Spitball action, live scan state, builder profile, Limited Evidence treatment, exactly three labeled idea cards, strongest-recommendation treatment, evidence links, and Spitball Again. Preserve form values for retry and reroll; send compact starred summaries for avoidance.
  Acceptance: Blank usernames are blocked inline; failures offer Try Again and Edit Inputs; real repository names appear during work; the builder profile precedes ideas; cards visibly show category, pitch, duration, A+B+C equation, and recommendation; reroll retains inputs and warns that unstarred ideas will be replaced.
  Verify: Exercise one successful run, invalid username, empty portfolio fixture, failed landscape fixture, Try Again, Edit Inputs, and reroll; run component tests for validation and state transitions, then run lint/test/build.

- [ ] **8. Add Markdown artifacts and the 50-idea star notebook — 30 minutes**
  Spec ref: `spec.md > Local Persistence Adapter`, `spec.md > Markdown Artifact Builder`, `spec.md > Star lifecycle`, and `spec.md > Markdown lifecycle`
  What to build: Implement versioned local storage for the latest run and up to 50 complete starred ideas. Build `/idea/[ideaId]`, deterministic Markdown preview, UTF-8 `.md` download, `/starred`, empty state, star controls, and the accessible named confirmation dialog for removal. Keep previews addressable from the current batch or starred collection.
  Acceptance: Stars persist after refresh/browser reopening on the same device; duplicate stars remain single; the fifty-first star is blocked with an explanatory message; unstar requires confirmation; cancelled removal changes nothing; every saved idea reopens and downloads as `spitball-project-name.md`; no cross-device sync is claimed.
  Verify: Run storage and Markdown tests, manually refresh and reopen the app, fill storage with 50 fixtures, verify the full state, confirm removal behavior, open an unavailable idea ID, and compare one downloaded file with its preview.

- [ ] **9. Apply the notebook identity and accessibility pass — 30 minutes**
  Spec ref: `spec.md > Notebook Presentation Layer` and `scope.md > What We Are Building`
  What to build: Create the paper, ink, pencil, red-mark, and star design tokens; readable body typography; scratchy display typography; imperfect card borders; scribbled stage transitions; navigation; responsive layouts; visible focus states; reduced-motion behavior; and original lightweight SVG scribbles. Polish the A+B+C reveal as the visual hero. Add no sound unless every required behavior is already stable and the addition is trivial and off by default.
  Acceptance: The interface feels like a working notebook on desktop and mobile without sacrificing readability; recommendation, category, progress, star, and error states never depend on color alone; keyboard navigation works; reduced motion removes nonessential movement.
  Verify: Inspect all three routes at narrow mobile and desktop widths, keyboard through every interaction, enable reduced motion, run an accessibility scan available in the browser, and capture the hero reveal. **Visual pause 2:** show Zoe the complete notebook journey and gather only must-fix visual feedback.

- [ ] **10. Harden the MVP against demo failures — 30 minutes**
  Spec ref: `spec.md > Error Strategy`, `spec.md > Security And Privacy`, and `spec.md > Risks And Verification`
  What to build: Finish bounded provider retries, AbortController timeouts, safe participant messages, request length limits, GitHub URL validation, logging redaction, corrupted-storage recovery, aggregate result invariants, and every automated check listed in the spec. Confirm no raw HTML path exists and README prompt-like text cannot alter the requested task.
  Acceptance: Invalid requests, missing users, empty portfolios, rate limits, provider failures, invalid AI output, failed landscape searches, interrupted streams, corrupted storage, and full star storage all recover according to the PRD. No key, complete prompt, or full README body appears in browser code or logs.
  Verify: Run `npm run lint`, `npm run test`, and `npm run build`; inspect the production client bundle/environment exposure; run mocked failures for every safe error code; inspect logs from one success and one failure.

- [ ] **11. Deploy and rehearse on Render — 30 minutes plus user-controlled setup**
  Spec ref: `spec.md > Deployment` and `spec.md > Demo preparation requirements`
  What to build: Finalize README setup instructions and Render commands, push the fresh repository when GitHub access is available, connect one Render Node web service, and add `FEATHERLESS_API_KEY`, `FEATHERLESS_MODEL`, and `GITHUB_TOKEN` privately. Verify streaming through the deployed proxy and prepare a stored successful run as backup material.
  Acceptance: The public Render URL loads all three routes; a real demo portfolio completes; repository names stream progressively; Markdown downloads work; stars persist after reopening; reroll avoids a starred idea; secrets remain server-only.
  Verify: Run the entire intended two-minute path on the Render URL, reopen the browser to verify persistence, inspect direct idea links, rerun lint/test/build against the deployed commit, and record the final URL and commit SHA in the README or build notes.

- [ ] **12. Prepare the Devpost handoff — 25 minutes**
  Spec ref: `spec.md > Demo And Submission Flow` and `prd.md > Submission Proof Points`
  What to build: Make the repository judge-ready with a concise README covering the problem, educational value, architecture, AI usage, public-data boundary, setup, limitations, and demo path. Prepare a two-minute demo outline centered on the A+B+C reveal, a screenshot/clip capture list, tested links, known limitations, and a short handoff note for `$prepare-submission`. Do not submit anything in this item.
  Acceptance: A reviewer can understand what Spitball does, why AI is essential, what Featherless and GitHub each contribute, how to run it, what the landscape check does not guarantee, and where to see every judging proof point. The demo plan includes the builder profile, hero recombination, recommendation, landscape evidence, Markdown, starring, and reroll.
  Verify: Follow the README from a clean environment as far as credentials allow, open every public link, run the final lint/test/build suite, rehearse the demo under two minutes, and confirm the project is ready to enter `$prepare-submission`.

## Completion Definition

The autonomous build is complete only when:

- Items 1–12 are checked or an explicitly user-controlled deployment blocker is recorded;
- both visual pauses have occurred;
- the final local and deployed checks pass;
- no postponed feature entered the critical path; and
- the handoff points to `$prepare-submission` rather than submitting automatically.
