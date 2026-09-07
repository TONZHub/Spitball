# Spitball — Product Requirements Document

## Product Summary

Spitball is an AI-assisted hackathon ideation tool for people who already have a visible history of building projects. A user enters a GitHub username, optionally names a topic, and chooses how much time they have. Spitball reads the README files from up to 25 recently updated eligible public repositories, reflects the user's demonstrated themes and capabilities, and recombines those capabilities into three personalized project ideas.

Each result must explain why it fits this particular builder. Spitball names the repositories that informed the idea, identifies reusable pieces of prior work, recommends a new skill to learn, sizes the plan to the user's available time, and completes a lightweight landscape check for similar products. The landscape check suggests a possible differentiator but never claims that an idea is wholly original.

The experience is designed to break the stall between finishing one project and starting the next. It is not judged by the number of ideas generated. It succeeds when one suggestion is compelling and credible enough that the user wants to create a repository and begin.

## Target User

The primary user is a returning builder with:

- a valid GitHub username;
- at least one eligible public repository with useful README content;
- enough prior work to reveal some evidence of interests or capabilities; and
- a desire to find an achievable next project.

The user does not need to be an expert programmer. They may be an integration-oriented or AI-assisted builder whose skill lies in connecting tools, services, APIs, and generated code into functioning products.

Spitball is not intended for someone with no GitHub account or no public project history. The product should state that boundary plainly rather than pretending it can personalize ideas without evidence.

## Core User Journey

### 1. Begin on the notebook cover

The first page presents the complete starting form together, without requiring an account or introductory wizard.

The user sees:

- a required **GitHub Username** field;
- an optional **What should the ideas be about?** field;
- a visible **Available Time** choice;
- one prominent **Spitball** action; and
- a short explanation that Spitball reads public repository README files and does not access private repositories.

Available-time choices are:

- Weekend;
- One Week;
- One Month; and
- More Than a Month.

**One Week** is selected by default, but the choice remains visible so the user understands that duration affects the results.

### 2. Watch the portfolio scan

After the user selects **Spitball**, the form becomes a visible work-in-progress state. Repository names appear as scribbled notes while Spitball evaluates them. The experience should communicate that the result is being grounded in real projects rather than generated from the username alone.

The scan may inspect the user's public portfolio, but only up to the 25 most recently updated eligible repositories contribute README content. A repository is eligible only when it is:

- public;
- not a fork;
- not archived;
- not empty; and
- accompanied by useful README content.

The user should not need to approve repositories one by one in the proof of concept.

### 3. See the builder profile before the ideas

When the run completes, Spitball reveals a short builder profile first. This is the interpretive bridge between the repository scan and the recommendations.

The profile includes:

- two to four recurring themes or interests;
- three to six demonstrated capabilities;
- named repository evidence supporting those observations; and
- a **Limited Evidence** label when only one or two eligible repositories were available.

The profile must distinguish observation from inference. It may say that the portfolio “suggests” an interest or capability, but it must not claim personal facts that cannot be supported by repository content.

### 4. Reveal three intentional candidates

Below the builder profile, Spitball displays exactly three project ideas:

1. **Safest Bet** — close to the user's demonstrated strengths and most achievable within the chosen duration.
2. **Interesting Stretch** — grounded in existing capabilities but designed to teach one meaningful new skill.
3. **Wild Card** — a surprising but still credible combination of the user's past work.

One of the three is marked **Strongest Recommendation**. The recommendation may belong to any category; it is based on the best combined balance of portfolio fit, differentiation, educational value, and feasibility.

The central reveal should make the recombination visible in plain language, for example:

> You built A in Repo One, B in Repo Two, and C in Repo Three. Here is what A + B + C could become.

Each collapsed idea card shows enough information to compare the candidates quickly:

- project name;
- category label;
- one-sentence pitch;
- capability combination;
- chosen-duration fit;
- strongest-recommendation marker when applicable; and
- star control.

### 5. Open the complete idea document

Selecting an idea opens its own Markdown preview. The document contains:

- project name and category;
- one-line pitch;
- the user problem;
- why the idea fits this builder;
- the specific repositories and capabilities that inspired it;
- reusable components from previous work;
- a summary of similar products found during the landscape check;
- a clearly worded possible differentiator;
- the new skill or skills the user would practice;
- why the project fits the optional topic, when one was supplied;
- a build plan sized to the selected duration; and
- a concise definition of what “done” means for that plan.

The preview includes a **Download `.md`** action. The downloaded filename follows the readable pattern `spitball-project-name.md`, with unsafe filename characters removed. The downloaded content matches the visible preview.

### 6. Star ideas worth keeping

Every idea can be starred from its card or Markdown preview.

Starred ideas appear on a separate **Starred Ideas** notebook page. They remain available after:

- navigating back to the main page;
- generating another batch;
- refreshing the browser; and
- closing and reopening Spitball on the same device.

This persistence does not require an account. The interface should not suggest that starred ideas are synchronized to other devices.

Each starred entry retains access to its full Markdown preview and download action.

Selecting the star again begins removal. Spitball asks for confirmation with language that names the idea and makes the consequence clear. The idea is removed only after the user confirms; cancelling leaves it untouched.

### 7. Spitball again without losing good work

After a successful run, the user can choose **Spitball Again**.

The next run:

- keeps the same GitHub username, optional topic, and available-time choice;
- preserves every starred idea;
- generates three fresh candidates; and
- avoids ideas that are substantially similar to anything already starred.

Unstarred ideas from the current batch may be replaced. The interface must make this consequence understandable before the user rerolls, either through nearby explanatory text or clear wording on the action.

The user may edit the topic or available time before beginning another run if they want differently shaped results.

## Epics And User Stories

### Epic 1: Start a personalized run

#### Story 1.1 — Supply a portfolio identity

As a returning builder, I want to enter my GitHub username so that Spitball can ground its recommendations in work I have already published.

Acceptance criteria:

- The opening page visibly labels GitHub username as required.
- The page explains that only public repositories and README content are used.
- Submitting an empty username does not start a run.
- An empty submission produces an inline instruction to enter a GitHub username.
- The user's other form selections remain intact after validation fails.
- No account creation or GitHub authorization is requested.

#### Story 1.2 — Steer the subject without being forced to

As a builder with a theme in mind, I want to optionally describe what my ideas should be about so that the generated projects can fit a hackathon, interest, or problem area.

Acceptance criteria:

- The topic field is clearly marked optional.
- A user can start a run with the topic left empty.
- When supplied, the topic is visibly reflected in all three idea documents.
- The topic guides the ideas without erasing the connection to repository evidence.
- The user can edit or clear the topic before rerunning.

#### Story 1.3 — Set an achievable ambition

As a builder with limited time, I want to choose my available duration so that the ideas and plans are realistically sized.

Acceptance criteria:

- All four duration choices are available on the opening page.
- One Week is visibly selected by default.
- The user can change the selection before any run.
- Every completed idea states the selected duration.
- Each idea's build plan changes in scope according to the selected duration.
- The duration affects more than wording; a Weekend plan contains fewer expected outcomes than a One Month or More Than a Month plan.

### Epic 2: Understand what Spitball learned

#### Story 2.1 — See the repositories being considered

As a user waiting for results, I want to see repository names appear during the scan so that I trust the analysis is based on my actual work.

Acceptance criteria:

- A distinct progress state replaces or disables the start action while a run is active.
- Repository names appear visibly as they are considered.
- The progress state uses the notebook's scribbled visual language.
- The user is never told that a private repository was accessed.
- The run communicates when it is moving from portfolio reading to idea generation and landscape checking.
- The interface does not claim success until all required stages, including the landscape check, are complete.

#### Story 2.2 — Receive an evidence-grounded builder profile

As a builder, I want a concise reflection of my recurring themes and capabilities so that I can recognize patterns across projects that I may not have noticed myself.

Acceptance criteria:

- The builder profile appears before any idea cards.
- Every capability or theme is supported by at least one named repository.
- The profile uses cautious language for inferred interests.
- The profile contains no unsupported biographical or personality claims.
- With one or two eligible repositories, the profile is labeled Limited Evidence.
- Limited Evidence does not prevent idea generation.

### Epic 3: Receive differentiated project ideas

#### Story 3.1 — Compare three kinds of opportunity

As someone deciding what to build next, I want three deliberately different candidates so that I can compare comfort, growth, and surprise.

Acceptance criteria:

- A successful run returns exactly three idea cards.
- The cards are labeled Safest Bet, Interesting Stretch, and Wild Card.
- The three ideas are meaningfully distinct in problem, experience, or capability combination.
- Each card displays a project name, pitch, repository-derived capability combination, and duration fit.
- The Wild Card remains plausible within the user's selected time rather than becoming a joke result.
- The Interesting Stretch names at least one concrete skill the user would practice.
- The Safest Bet remains a new project proposal rather than simply telling the user to continue an existing repository.

#### Story 3.2 — Understand the recommendation

As a user who does not want another wall of options, I want Spitball to recommend one candidate so that I have a credible place to begin.

Acceptance criteria:

- Exactly one card is marked Strongest Recommendation.
- The recommended card explains why it was selected.
- The rationale mentions portfolio fit, feasibility, educational value, or differentiation rather than unexplained AI confidence.
- The recommendation remains visually identifiable in both the card and Markdown preview.
- Spitball does not imply that the recommendation is objectively correct or guaranteed to win a hackathon.

#### Story 3.3 — See the portfolio recombination

As a returning builder, I want to see how separate past capabilities were combined so that the idea feels personal and teaches me how my skills can transfer.

Acceptance criteria:

- Every idea names at least two capabilities drawn from prior repository evidence when enough evidence exists.
- The interface presents the combination in a compact A+B+C-style statement.
- The supporting repository names are visible without requiring the user to infer their source.
- The combination explains a causal connection to the proposal, not merely a list of unrelated repositories.
- When evidence is limited, Spitball does not fabricate a third capability to complete the pattern.

#### Story 3.4 — Complete a landscape check

As a builder concerned about repeating an obvious existing product, I want each idea checked against similar work so that I can make a more differentiated choice.

Acceptance criteria:

- Every successful idea document contains a landscape-check section.
- The section names relevant similar products or states that no close match was found in the limited check.
- It identifies at least one meaningful distinction the user could pursue.
- It labels the check as lightweight and avoids guaranteeing originality.
- A run is not presented as successful if the landscape check fails.
- If the check fails, the user sees a retry action rather than incomplete idea results.

### Epic 4: Turn an idea into a usable artifact

#### Story 4.1 — Read the complete proposal

As a user evaluating an idea, I want its reasoning and plan collected in one document so that I can decide whether to build it.

Acceptance criteria:

- Selecting any card opens a Markdown preview dedicated to that idea.
- The preview includes every content section promised in the core journey.
- Named repository evidence remains traceable within the document.
- The plan has a clear final outcome appropriate to the selected duration.
- The user can return to the three-card comparison without losing the completed run.

#### Story 4.2 — Download the proposal

As a builder ready to continue elsewhere, I want to download an idea as Markdown so that I can place it in a repository, notes app, or coding workflow.

Acceptance criteria:

- Every complete idea preview has a visible Download `.md` action.
- Activating the action produces one Markdown file.
- The filename begins with `spitball-` and contains a readable form of the project name.
- The file content matches the proposal shown in the preview.
- Downloading does not require starring the idea or creating an account.

### Epic 5: Keep and explore ideas

#### Story 5.1 — Star an idea

As a user who found a promising result, I want to star it so that generating more ideas does not make me lose it.

Acceptance criteria:

- A star control is available on every idea card and preview.
- Activating an unselected star immediately marks the idea as saved.
- The saved state is visually clear.
- The idea appears on the separate Starred Ideas page.
- Starred ideas remain after refresh and after closing and reopening the app on the same device.
- The product does not claim cross-device synchronization.

#### Story 5.2 — Revisit and remove starred ideas

As a user comparing possibilities over time, I want a separate place for starred ideas and a safe way to remove them.

Acceptance criteria:

- The primary interface includes a visible route to Starred Ideas.
- The page lists every currently starred idea.
- Each entry can reopen its complete Markdown preview and download action.
- Attempting to unstar presents a confirmation naming the idea.
- Cancelling leaves the idea starred.
- Confirming removes it from the page and persistent starred collection.
- When there are no starred ideas, the page explains how to add one and offers a path back to Spitball.

#### Story 5.3 — Generate another batch

As a user who wants more possibilities, I want to rerun Spitball without re-entering everything or losing favorites.

Acceptance criteria:

- A successful result page offers a Spitball Again action.
- The action preserves the current username, topic, and duration.
- Starred ideas remain available throughout the new run.
- The next successful batch contains three newly generated candidates.
- New candidates are screened against starred ideas and avoid substantial repetition.
- The user can change topic or duration before beginning another batch.
- Unstarred results may be replaced, and the interface communicates that starring is how to preserve them.

### Epic 6: Recover cleanly from failure

#### Story 6.1 — Correct an unusable portfolio

As a user whose username or portfolio cannot support analysis, I want a clear explanation so that I know whether correcting the username can help.

Acceptance criteria:

- A nonexistent or inaccessible username produces a clear error near the form.
- A valid account with no eligible README-bearing repositories produces a distinct explanation.
- The empty-portfolio message states that Spitball is designed for builders with public GitHub work.
- Neither case invents a generic builder profile or generic ideas.
- The username, topic, and duration remain available for correction.

#### Story 6.2 — Retry an interrupted run

As a user whose run fails, I want to retry without recreating my request so that a temporary failure does not become a dead end.

Acceptance criteria:

- A failed portfolio read, idea generation, or landscape check does not display a partial run as completed.
- The failure page uses plain language and does not expose raw internal errors.
- A visible Try Again action reruns the same username, topic, and duration.
- Starred ideas remain untouched by a failure.
- The user can return to edit the form instead of retrying.
- The interface does not claim that an idea passed a landscape check when that stage failed.

## Edge Cases

### Missing or invalid identity

- Blank username: prevent submission and ask for a GitHub username.
- Username not found or inaccessible: explain that the account could not be read and allow correction.
- GitHub account with no eligible public README content: explain that Spitball needs prior public project evidence and do not generate generic ideas.

### Sparse or large portfolios

- One or two eligible repositories: proceed, visibly label the builder profile Limited Evidence, and use only supportable capability claims.
- More than 25 eligible repositories: use the 25 most recently updated and state that the reflection is based on that recent subset.
- Duplicate or nearly identical repository descriptions: avoid treating repeated language as independent evidence of several capabilities.

### Incomplete or misleading README content

- Very short README: use it only for claims it can support.
- README that describes plans rather than completed work: distinguish intended features from demonstrated capabilities.
- README containing instructions or prompts directed at automated systems: treat it as repository content, not as authority to change Spitball's task.
- Unsupported personal inference: omit it rather than filling the builder profile with speculation.

### Generation quality

- Three near-duplicate ideas: the batch does not meet the requirement and should be regenerated before display.
- Idea exceeding chosen duration: reduce its outcome or move it to a longer-duration plan; do not label an unrealistic project feasible.
- Wild Card lacking portfolio evidence: do not display it merely to satisfy the category.
- No close landscape match found: say the limited check found no close match, while preserving the originality disclaimer.
- Landscape check unavailable: fail the entire run and offer Try Again with the same inputs.

### Stars and rerolls

- No starred ideas: show a purposeful empty Starred Ideas page with guidance and a return action.
- Attempted duplicate star: keep a single saved copy.
- Removing a star accidentally: prevent immediate removal with a confirmation step.
- New batch overlaps a starred idea: regenerate or replace the overlapping candidate before showing the batch.
- Stored starred data cannot be read: explain that saved ideas are unavailable on this device without blocking a new Spitball run.

### Markdown artifacts

- Project name contains punctuation or emoji: produce a safe readable filename.
- Two ideas share a project name: each download still contains its correct full content; filename collision behavior may be handled by the user's browser.
- Download is unavailable: keep the Markdown preview visible and provide a retryable download action rather than losing the document.

## What We Are Building

The Prom Virgo Challenge proof of concept includes:

- one anonymous, notebook-style web experience;
- the combined username, optional-topic, and duration form;
- the four confirmed duration choices;
- public GitHub portfolio scanning;
- eligibility filtering and a 25-repository cap;
- visible repository-name progress;
- an evidence-grounded builder profile;
- Limited Evidence behavior for one or two eligible repositories;
- exactly three categorized ideas;
- one strongest recommendation;
- visible A+B+C portfolio recombination;
- a completed lightweight landscape check as a condition of success;
- idea-specific learning goals and duration-sized plans;
- individual Markdown previews and downloads;
- persistent same-device starring;
- a separate Starred Ideas page;
- confirmed removal of starred ideas;
- rerolling with preserved inputs;
- duplicate avoidance against starred ideas; and
- clear empty, invalid, and retry states.

Notebook styling is part of the product rather than an optional skin. The interface should use paper-like surfaces, scratchy typography, imperfect lines, and scribbled progress cues while preserving readability. A subtle optional scribble sound may be included only after all required behaviors work.

## What We Would Add With More Time

### Notion integration

Allow a user to send a complete idea document to Notion. This is postponed because the Markdown artifact already proves portability without adding connection setup to the core journey.

### Private repository support

Add GitHub authorization and explicit repository selection. This is postponed because authentication and private-data consent would enlarge both the build and the privacy surface.

### Accounts and cross-device synchronization

Synchronize starred ideas and history between devices. This is postponed because anonymous same-device persistence is sufficient to prove the keep-and-reroll experience.

### Saved run history

Preserve every completed batch, compare ideas between runs, and restore unstarred results. This is postponed because starring already gives the user a deliberate preservation mechanism.

### Deeper project analysis

Inspect selected source files, dependencies, releases, and live demos in addition to README content. This is postponed to keep the analysis transparent, bounded, and achievable during the hackathon.

### Richer research controls

Let users choose markets, regions, research depth, or acceptable similarity. This is postponed because the MVP needs one honest landscape-check behavior, not a full competitive-intelligence product.

### Collaboration

Allow teams to combine portfolios, vote on ideas, and share a notebook. This is postponed because the solo-builder journey is complete without team infrastructure.

### Expanded notebook playfulness

Add more animation, sound design, stamps, torn-paper transitions, and hand-drawn personalization. These are postponed until the functional story is reliable and demonstrable.

## Submission Proof Points

The finished proof of concept should visibly demonstrate the following claims:

### Educational Impact

- Spitball identifies demonstrated capabilities using evidence from the user's own work.
- It names a useful next skill for each proposal.
- It translates that skill into a concrete project plan matched to available time.
- The builder can learn capability transfer: previous work is not merely archived but recombined into a new challenge.

### Creative Use of AI/ML

- The portfolio becomes the prompt rather than a blank text box.
- AI performs three connected forms of reasoning: reflection, recombination, and differentiation.
- The A+B+C reveal makes the reasoning legible instead of presenting unexplained idea generation.
- Safest Bet, Interesting Stretch, and Wild Card demonstrate controlled variation rather than three random completions.

### Technical Execution Visible to a Judge

- Real public repositories are visibly discovered and filtered.
- Repository names appear during the scan and again as evidence in the results.
- A completed run produces three distinct cards, a recommendation, and full Markdown artifacts.
- Starred ideas survive rerolls and browser reopening on the same device.
- A reroll avoids substantial duplication with saved ideas.
- Failure states are recoverable and do not masquerade as successful analysis.

### Pitch and Demo

- The opening problem is immediate: coding agents can build an idea, but they cannot help when the builder does not know what deserves building.
- The builder-profile reveal proves personalization.
- The A+B+C line is the primary “oh, damn” moment.
- The landscape check answers the fear of unknowingly rebuilding an obvious clone without making an impossible originality promise.
- The Markdown download shows that the result is actionable beyond the demo.
- The star-and-reroll sequence closes the loop: keep what sparks, throw again, and never lose the ideas worth pursuing.

The two-minute demo is successful if a judge can answer all four questions before it ends:

1. What did Spitball learn about this builder?
2. Which past projects support that conclusion?
3. Why is the recommended idea achievable and differentiated?
4. What can the builder do with the idea immediately afterward?
