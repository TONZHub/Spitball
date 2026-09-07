# Spitball Build Notes

## Onboarding

- Guided build started for the Prom Virgo Challenge.
- Project name confirmed: **Spitball**.
- Core concept: analyze the README files across a user's full public GitHub portfolio and generate evidence-grounded hackathon ideas.
- Privacy boundary: public repositories only; no private-repository access.
- Repository filtering: ignore forks, archived repositories, empty repositories, and repositories without README content.
- Optional steering: users may specify what they want their hackathon ideas to be about.
- Idea-card content: pitch, repository evidence, reusable components, new skills to learn, hackathon fit, and a short build plan.
- Audience: anyone with public GitHub work.
- Visual direction: notebook energy, scratchy typography, scribbles, and optional scribble sounds.
- Voice: broad and flexible—ideas should be allowed to range from practical to strange, consistent with the name "Spitball."
- Desired optional integration: send or save selected ideas to Notion if available.
- Scope guard: Notion is an enhancement, not a dependency for the first proof of concept.

## Active Shaping Moments

- Zoe corrected the initial one-repository concept to cover all usable public repositories.
- Zoe made non-intrusiveness explicit: README-first analysis of public work only.
- Zoe broadened the product beyond one user type: the intended audience is anyone.
- Zoe chose an expressive notebook interface rather than a neutral developer dashboard.

## Interview Record

- Onboarding rounds completed: 3.
- Deepening rounds completed: 0.

## Scope

- The MVP is constrained to one intensive evening of implementation.
- The product is one pipeline with three stages: portfolio reflection, capability recombination, and a lightweight landscape check.
- Capability recombination is the demo centerpiece; the reflection makes it personal, and the landscape check makes the result more credible.
- Analysis is capped at the 25 most recently updated eligible public repositories.
- Output is capped at three intentionally different candidates: Safest Bet, Interesting Stretch, and Wild Card.
- One candidate must be marked as the strongest recommendation.
- The user can optionally steer the topic and specify the time available.
- The landscape check must propose differentiation without claiming or guaranteeing originality.
- The product succeeds when one idea is compelling enough to start, not when it produces the largest number of ideas.
- Notion integration, accounts, private repositories, saved histories, collaboration, deep source-code analysis, and elaborate sensory polish were cut from the MVP.
- Notebook styling remains part of the MVP identity; optional sound remains subordinate to the working core.

## Scope Shaping Moments

- Zoe identified the emotional center as preventing idea-stage stalls without requiring every project to become a monumental undertaking.
- The broad three-part ambition was preserved by sequencing it as a single experience instead of treating it as three separate products.
- The phrase “your portfolio becomes the prompt” became the product's strategic distinction from coding agents and generic idea generators.
- The originality concern was reframed into an honest landscape check, keeping the value while avoiding an impossible promise.
- The build was narrowed around a two-minute demo and a one-evening proof of concept.

## Scope Interview Record

- Mandatory shaping beats completed: 5.
- Scope deepening rounds completed: 0; participant chose to proceed directly to the document.

## Product Requirements

- The opening page contains the GitHub username, optional topic, available-time choice, and one primary Spitball action together.
- Available-time choices are Weekend, One Week, One Month, and More Than a Month; One Week is the visible default.
- Repository names appear as scribbled notes during analysis.
- The builder profile is revealed before the three idea cards.
- Each complete idea opens as its own Markdown preview and can be downloaded as `spitball-project-name.md`.
- Starred ideas live on a separate Starred Ideas page and persist across visits on the same device without an account.
- Removing a star requires confirmation.
- Spitball Again preserves the inputs and stars, produces three fresh ideas, and avoids substantial similarity to starred ideas.
- Spitball is explicitly for people with an existing public GitHub trail; it does not manufacture personalization for an empty portfolio.
- One or two eligible repositories may proceed with a Limited Evidence label.
- A failed landscape check fails the whole run instead of showing incomplete results.
- Try Again repeats the same request without making the user re-enter it.
- The A+B+C repository-to-capability reveal is the primary demo moment.

## PRD Shaping Moments

- Zoe added starring as a necessary part of rerolling: good ideas must remain safe while the user keeps exploring.
- Zoe chose a separate Starred Ideas page rather than pinning saved ideas above every new batch.
- Zoe required confirmation before removing a starred idea.
- Zoe redirected expanded idea details into portable Markdown artifacts rather than another ordinary application detail screen.
- Zoe chose strict landscape-check behavior: if differentiation research fails, the batch should fail cleanly and retry rather than present partial confidence.
- Zoe confirmed that Spitball assumes an existing GitHub history and should not dilute its purpose for people without one.

## PRD Interview Record

- Mandatory product-requirement beats completed: 5.
- PRD deepening rounds completed: 0; participant chose to proceed directly to the document.

## Technical Specification

- Deployment confirmed: one public Render web service connected to a fresh GitHub repository.
- Application architecture: one full-stack Next.js and TypeScript project; no database, user authentication, queue, or separate frontend deployment.
- AI provider confirmed: Featherless, available to Zoe without usage cost until September 22, 2026.
- Preferred model: Qwen3 235B Instruct if available in Zoe's Featherless catalog; the exact model remains environment-configurable.
- Landscape boundary confirmed: search similar public GitHub repositories rather than adding a second web-search provider.
- GitHub access confirmed: one read-only server token stored in Render; visitors do not authenticate.
- Main pipeline: GitHub portfolio retrieval → Featherless draft pass → three GitHub searches → Featherless final pass → validated result.
- Progress delivery: NDJSON streaming from one server route so repository scribbles reflect real progress.
- README cap increased at Zoe's direction from the proposed 6,000 characters to 10,000 characters per repository.
- Aggregate README safety ceiling: 200,000 normalized characters per run.
- Persistent client data: latest run plus up to 50 starred complete ideas in versioned browser storage.
- Full starred notebook behavior: block the fifty-first star with an explanatory message until one is removed.
- AI reliability: one structured-output repair attempt per pass, then fail the run cleanly.
- Markdown is built deterministically from validated idea data rather than accepted as raw model output.

## Spec Shaping Moments

- Zoe chose familiar Render hosting over the initial Vercel recommendation.
- Zoe supplied Featherless as the available inference provider, removing the need to purchase another model API for the build window.
- Zoe accepted a narrower but honest GitHub-project landscape check for the MVP.
- Zoe authorized a private server-side GitHub token while preserving the product's no-login promise for visitors.
- Zoe expanded each README evidence allowance to 10,000 characters because the current Featherless access window removes immediate inference-cost pressure.
- Zoe accepted the streaming two-pass design and selected 50 as the starred-idea boundary.

## Spec Interview Record

- Mandatory technical-spec beats completed: 5.
- Spec deepening rounds completed: 0; participant chose to proceed directly to the document.

## Checklist Draft

- Plan ownership: Zoe handed checklist design and sequencing to Codex.
- Proposed build mode: autonomous execution.
- Verification preference: required at every item, with participant-facing visual pauses after the first real AI result and after notebook polish.
- Git cadence: one local commit per completed checklist item as a revert point.
- Check-in cadence: visual pauses, genuine credential/deployment blockers, and final handoff only.
- Wow moment reconfirmed: the A+B+C reveal remains the hero shot.
- Draft sequence: twelve risk-first items, each targeted at approximately 15–30 minutes before user-controlled setup.
- The checklist ends with a Devpost preparation handoff and does not authorize automatic submission.
- Workload gut-check: Zoe confirmed that twelve items and the estimated 4–6 focused hours are appropriate.
- Checklist status: locked for autonomous execution.

## Checklist Interview Record

- Planning path: handed off to Codex.
- Checklist deepening rounds: not applicable on the handoff path.
- Participant review rounds: 1.

## Build Item 1 — Runnable Project Shell

- Created the Next.js App Router and TypeScript shell with home, idea, and starred routes.
- Added the package lock, Node 24 pin, environment-variable template, strict TypeScript configuration, ESLint, Vitest, and initial notebook tokens.
- Preserved the unrelated Receipts Python files without staging them into the Spitball repository.
- Verification initially exposed two ecosystem compatibility breaks caused by unconstrained `latest` installs: TypeScript 7 was incompatible with the current TypeScript ESLint layer, and ESLint 10 was incompatible with the React plugins bundled by Next.js 16.
- Zoe approved pinning TypeScript 6.0.3 and ESLint 9.39.5. The exact compatible versions are now frozen in `package-lock.json`.
- Verified with `npm run lint`, `npm run test` (1 passing test), and `npm run build` (all planned routes compiled).

## Build Item 2 — Contracts And Deterministic Core

- Added shared request, stream, repository, run, idea, and storage types.
- Added strict Zod schemas plus cross-field invariants for category coverage, unique IDs, recommendation integrity, requested duration, and repository evidence links.
- Added deterministic Markdown and safe filename generation rather than trusting raw model formatting.
- Added keyword/title similarity checks for collisions within a batch and against starred ideas.
- Initial test loading exposed a missing Vitest alias for Next.js `@/` imports. Zoe approved adding the alias and marking the package as ESM.
- Verified with `npm run lint`, `npm run test` (11 passing tests across 4 files), and `npm run build`.

## Build Item 3 — Public GitHub Portfolio Ingestion

- Added an authenticated GitHub REST client with an anonymous public-data fallback for local smoke testing, bounded timeouts, one transient retry, rate-limit recognition, and safe provider errors.
- Added recent-first public repository discovery, fork/archive/empty filtering, README decoding, missing-README skipping, the 25-repository cap, 10,000-character per-README cap, and 200,000-character aggregate cap.
- Added explicit Limited Evidence behavior and untrusted README normalization.
- The initial smoke runner could not open `tsx`'s IPC pipe inside the build executor. Zoe approved switching the command to Node's direct `--import tsx` loader.
- The live TONZHub smoke analyzed 5 eligible repositories from 6 candidates and collected 43,318 characters: Velvet_Signal, PromisePocket, Wisteria, Gesture, and PanicButton.
- The first production build caught a test callback returning `Array.push()`'s number instead of `void`; Zoe approved the one-line callback correction.
- Verified with `npm run lint`, `npm run test` (16 passing tests across 5 files), the live TONZHub smoke, and `npm run build`.
