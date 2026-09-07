# Spitball — Hackathon Build Scope

## Project Name Candidates

- **Spitball** — confirmed project name.
- Portfolio Pitchbook — descriptive fallback, but less distinctive.
- Repo Remix — emphasizes recombination, but loses the playful notebook identity.

## One-Line Summary

Spitball reads the README files across a person's usable public GitHub repositories, reflects what they have already learned to build, and recombines those capabilities into three personalized, landscape-aware hackathon ideas sized to their available time.

## Target User

Anyone with public GitHub work who wants to start another project but does not yet have an idea worth committing to.

The first version is especially useful for fast-moving, integration-oriented builders who:

- want to keep their hackathon momentum going;
- worry that their next idea may already exist in an obvious form;
- have useful components spread across several past projects;
- need a project scaled to a weekend, a week, a month, or longer; and
- learn best by building something compelling rather than following a detached curriculum.

## Problem

Starting a project often stalls before coding begins. Generic idea generators can produce endless suggestions, but they do not know what the builder has already made, what they could realistically reuse, or what would stretch them next. Other tools help implement an idea after the user supplies one; they do not turn the user's history into the starting material.

This creates two common traps:

1. The builder accidentally makes an undifferentiated version of something that already exists.
2. The builder assumes every worthwhile idea must be enormous or deeply personal, so smaller achievable experiments feel unworthy.

Spitball treats the builder's public portfolio as the prompt. Its educational value comes from helping people recognize their demonstrated abilities, recombine them, identify a reasonable next skill, and turn that reflection into an achievable project.

## Core Workflow

1. The user enters a GitHub username.
2. The user may optionally enter a topic and choose how much time they have.
3. Spitball fetches up to the 25 most recently updated eligible public repositories and reads their README files.
4. It produces a short **builder profile**: recurring themes, demonstrated capabilities, and supporting repository evidence.
5. It recombines those capabilities into three distinct ideas:
   - **Safest Bet** — closest to proven strengths.
   - **Interesting Stretch** — combines familiar pieces with a meaningful new skill.
   - **Wild Card** — the strangest credible recombination.
6. It performs a lightweight **landscape check** for similar products and describes how each proposal could be differentiated. This is guidance, not a guarantee of originality.
7. It marks one idea as the strongest recommendation.
8. Each idea card contains:
   - the pitch;
   - the past repositories and capabilities that inspired it;
   - components that could be reused;
   - new skills the user would learn;
   - why it fits the chosen topic or hackathon;
   - a duration-sized build plan; and
   - similar products plus a possible differentiator.
9. The user can choose **Spitball Again** to generate a new set.

Eligible repositories must be public, non-forked, non-archived, non-empty, and contain useful README content.

## What We Are Building

The one-evening proof of concept includes:

- a single-page notebook-style web interface;
- GitHub username input;
- optional topic steering;
- an available-time input;
- public GitHub repository discovery and filtering;
- README retrieval for up to 25 recently updated eligible repositories;
- an AI-generated portfolio reflection grounded in named repository evidence;
- an A+B+C capability-recombination engine;
- exactly three labeled project candidates;
- one clearly recommended candidate;
- a lightweight web landscape check with careful, non-absolute language;
- actionable learning goals and a time-sized build plan for each idea; and
- a reroll action.

The interface should feel like a working notebook: paper texture, scratchy typography, imperfect borders, handwritten annotations, and restrained scribble motion. One subtle scribble sound may be added only if it is quick, optional, and does not delay the working product.

## What We Are Not Building

The hackathon proof of concept will not include:

- private repository access or GitHub OAuth;
- deep source-code analysis beyond public repository metadata and README content;
- user accounts or persistent idea histories;
- collaboration or team workspaces;
- Notion export or synchronization;
- an originality guarantee or exhaustive market research;
- a complex multi-provider research system;
- elaborate audio, animations, or decorative gimmicks; or
- production-scale ingestion, caching, billing, or abuse prevention.

Notion and additional notebook gimmicks are explicit post-MVP enhancements.

## Inspiration And References

- **GitHub Copilot** demonstrates the value of repository context, but generally helps implement an idea the user already has.
- **Replit Agent and Lovable** can turn prompts into applications, but still expect the user to arrive with the initial concept.
- **Spotify Wrapped** shows how a person's history can become an engaging identity mirror rather than a plain activity log.

Spitball combines those lessons into a different interaction: **your portfolio becomes the prompt**. The builder profile makes the experience personal, capability recombination makes it inventive, and the landscape check makes its recommendations more trustworthy.

## Demo Path

The two-minute demo should use a real public GitHub username with a varied portfolio.

1. Open the notebook interface and enter the username.
2. Add a topic such as **education** and choose **one week**.
3. Show Spitball scanning and filtering the public repositories.
4. Reveal the builder profile with two or three named repository citations.
5. Show the three labeled ideas and the strongest recommendation.
6. Expand the recommended idea to reveal:
   - the specific A+B+C capability combination;
   - reusable work from prior repositories;
   - the skill the user would learn next;
   - the one-week build plan; and
   - similar existing products with a proposed differentiator.
7. End by clicking **Spitball Again**, reinforcing that the portfolio can support more than one credible next project.

The demo succeeds if the audience can immediately answer: “Why this idea, why this builder, and why is it achievable now?”

## Submission Story

Most AI building tools begin after inspiration. Spitball works one step earlier.

It helps a person learn from their own public body of work, recognize patterns in what they have already built, and combine those abilities into a project that is both novel enough to explore and small enough to begin. Rather than issuing generic ideas, it shows its evidence: “Your previous work had A, B, and C—here is what becomes possible when those pieces are rearranged.”

For the Prom Virgo Challenge, Spitball's educational contribution is practical and personal. It teaches through reflection, capability transfer, scoped planning, and targeted skill growth. Its success metric is not how many ideas it generates; it is whether one recommendation is compelling enough for the user to create the repository and start building.
