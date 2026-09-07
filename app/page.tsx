"use client";

import { useState, type FormEvent } from "react";

import { StarButton } from "@/app/components/StarButton";
import { readStarredIdeas, toExcludedIdeas } from "@/lib/starred";
import type { Duration, DraftIdea, IdeaKind } from "@/types/spitball";

type PortfolioSummary = {
  consideredCount: number;
  evidenceLevel: "limited" | "standard";
  repositories: Array<{
    name: string;
    url: string;
    language: string | null;
    description: string | null;
  }>;
};

type BuilderProfile = {
  summary: string;
  themes: Array<{ claim: string; repositoryNames: string[] }>;
  capabilities: Array<{ claim: string; repositoryNames: string[] }>;
};

type SpitballResponse = {
  input: { username: string; topic?: string; duration: Duration };
  portfolio: PortfolioSummary;
  builderProfile: BuilderProfile;
  ideas: [DraftIdea, DraftIdea, DraftIdea];
  recommendationKind: IdeaKind;
};

const durationLabels: Record<Duration, string> = {
  weekend: "Weekend",
  "one-week": "One week",
  "one-month": "One month",
  "over-one-month": "More than one month",
};

const kindLabels: Record<IdeaKind, string> = {
  safest: "Safest Bet",
  stretch: "Interesting Stretch",
  wildcard: "Wild Card",
};

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState<Duration>("one-week");
  const [result, setResult] = useState<SpitballResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("Give Spitball a GitHub username first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/spitball", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          topic: topic.trim() || undefined,
          duration,
          excludedIdeas: toExcludedIdeas(readStarredIdeas()),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Spitball could not complete that run.");
      }

      setResult(payload as SpitballResponse);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Spitball could not complete that run.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="spitball-shell">
      <section className="hero-card">
        <p className="eyebrow">Your portfolio becomes the prompt.</p>
        <h1>What should you build next?</h1>
        <p className="hero-copy">
          Spitball reads the public README files across your GitHub work, finds the skills you have
          actually demonstrated, and recombines them into three hackathon-sized ideas.
        </p>

        <form className="spitball-form" onSubmit={submit}>
          <label>
            <span>GitHub username</span>
            <input
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. TONZHub"
              autoComplete="off"
              disabled={loading}
            />
          </label>

          <label>
            <span>Optional direction</span>
            <input
              name="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="robots, accessibility, weird web toys..."
              maxLength={200}
              disabled={loading}
            />
          </label>

          <fieldset>
            <legend>How much time do you have?</legend>
            <div className="duration-grid">
              {(Object.keys(durationLabels) as Duration[]).map((value) => (
                <label className={`duration-option ${duration === value ? "selected" : ""}`} key={value}>
                  <input
                    type="radio"
                    name="duration"
                    value={value}
                    checked={duration === value}
                    onChange={() => setDuration(value)}
                    disabled={loading}
                  />
                  <span>{durationLabels[value]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="privacy-note">
            Spitball reads public repository metadata and README text only. It does not need access
            to your private repositories.
          </p>

          <button className="spitball-button" type="submit" disabled={loading}>
            {loading ? "Reading the evidence..." : "Spitball three ideas"}
          </button>
        </form>

        {loading && (
          <div className="scan-note" role="status">
            <strong>Portfolio scan in progress.</strong>
            <span> GitHub first, Nemotron second. No generic idea soup.</span>
          </div>
        )}

        {error && (
          <div className="error-note" role="alert">
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="results" aria-live="polite">
          <div className="profile-card">
            <div>
              <p className="eyebrow">Builder profile</p>
              <h2>What the READMEs actually support</h2>
              <p>{result.builderProfile.summary}</p>
            </div>

            <div className="profile-columns">
              <div>
                <h3>Patterns</h3>
                <ul>
                  {result.builderProfile.themes.map((theme) => (
                    <li key={`${theme.claim}-${theme.repositoryNames.join("-")}`}>
                      {theme.claim} <small>({theme.repositoryNames.join(", ")})</small>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Capabilities</h3>
                <ul>
                  {result.builderProfile.capabilities.map((capability) => (
                    <li key={`${capability.claim}-${capability.repositoryNames.join("-")}`}>
                      {capability.claim} <small>({capability.repositoryNames.join(", ")})</small>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <details>
              <summary>
                Evidence: {result.portfolio.repositories.length} README
                {result.portfolio.repositories.length === 1 ? "" : "s"}
                {result.portfolio.evidenceLevel === "limited" ? " · limited evidence" : ""}
              </summary>
              <div className="repo-links">
                {result.portfolio.repositories.map((repository) => (
                  <a href={repository.url} target="_blank" rel="noreferrer" key={repository.url}>
                    {repository.name}
                    {repository.language ? ` · ${repository.language}` : ""}
                  </a>
                ))}
              </div>
            </details>
          </div>

          <div className="idea-grid">
            {result.ideas.map((idea) => {
              const recommended = idea.kind === result.recommendationKind;
              return (
                <article className={`idea-card idea-${idea.kind}`} key={`${idea.kind}-${idea.title}`}>
                  <div className="idea-heading">
                    <p className="idea-kind">{kindLabels[idea.kind]}</p>
                    <div className="idea-actions">
                      {recommended && <span className="recommendation">★ strongest fit</span>}
                      <StarButton
                        username={result.input.username}
                        topic={result.input.topic}
                        idea={idea}
                      />
                    </div>
                  </div>
                  <h2>{idea.title}</h2>
                  <p className="pitch">{idea.pitch}</p>
                  <p className="equation">{idea.capabilityEquation}</p>

                  <div className="idea-section">
                    <h3>Why you</h3>
                    <p>{idea.whyThisBuilder}</p>
                  </div>

                  <div className="idea-section">
                    <h3>Build plan · {durationLabels[idea.duration]}</h3>
                    <ol>
                      {idea.buildPlan.map((step) => (
                        <li key={`${step.label}-${step.outcome}`}>
                          <strong>{step.label}</strong> — {step.outcome}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="idea-section">
                    <h3>Evidence</h3>
                    <ul>
                      {idea.evidence.map((evidence) => (
                        <li key={`${evidence.repositoryName}-${evidence.contribution}`}>
                          <a href={evidence.repositoryUrl} target="_blank" rel="noreferrer">
                            {evidence.repositoryName}
                          </a>
                          : {evidence.contribution}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="idea-section">
                    <h3>What you would learn</h3>
                    <ul>
                      {idea.learningGoals.map((goal) => (
                        <li key={goal}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>

          <button
            className="spitball-again"
            type="button"
            onClick={() => {
              setResult(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Spitball again
          </button>
        </section>
      )}
    </div>
  );
}
