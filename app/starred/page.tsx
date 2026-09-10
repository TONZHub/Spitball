"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  MAX_STARRED_IDEAS,
  readStarredIdeas,
  removeStarredIdea,
  type SavedIdea,
} from "@/lib/starred";
import type { BuildDuration, IdeaKind } from "@/types/spitball";

const kindLabels: Record<IdeaKind, string> = {
  safest: "Safest Bet",
  stretch: "Interesting Stretch",
  wildcard: "Wild Card",
};

const durationLabels: Record<BuildDuration, string> = {
  weekend: "Weekend",
  "one-week": "One week",
  "two-weeks": "Two weeks",
  "one-month": "One month",
  "over-one-month": "More than one month",
};

export default function StarredPage() {
  const [items, setItems] = useState<SavedIdea[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => setItems(readStarredIdeas());
    refresh();
    setLoaded(true);
    window.addEventListener("spitball-starred-changed", refresh);
    return () => window.removeEventListener("spitball-starred-changed", refresh);
  }, []);

  function remove(id: string) {
    setItems(removeStarredIdea(id));
  }

  return (
    <section className="starred-page">
      <div className="starred-header">
        <div>
          <p className="eyebrow">Starred ideas</p>
          <h1>Your scratchbook.</h1>
          <p>
            Saved on this device. Spitball also uses these stars as a do-not-repeat list the next
            time you generate ideas.
          </p>
        </div>
        <span className="star-count">
          {items.length}/{MAX_STARRED_IDEAS}
        </span>
      </div>

      {loaded && items.length === 0 ? (
        <div className="empty-starred">
          <p>No stars yet. Keep the ideas that make you stop scrolling.</p>
          <Link href="/">Spitball some ideas →</Link>
        </div>
      ) : (
        <div className="starred-grid">
          {items.map((saved) => (
            <article className="idea-card saved-idea-card" key={saved.id}>
              <div className="idea-heading">
                <p className="idea-kind">{kindLabels[saved.idea.kind]}</p>
                <button className="remove-star" type="button" onClick={() => remove(saved.id)}>
                  ★ Remove
                </button>
              </div>
              <h2>{saved.idea.title}</h2>
              <p className="pitch">{saved.idea.pitch}</p>
              <p className="equation">{saved.idea.capabilityEquation}</p>
              <p className="saved-meta">
                From @{saved.username}
                {saved.topic ? ` · ${saved.topic}` : ""}
                {` · ${durationLabels[saved.idea.duration]}`}
              </p>

              <div className="idea-section">
                <h3>Why you</h3>
                <p>{saved.idea.whyThisBuilder}</p>
              </div>

              <div className="idea-section">
                <h3>Build plan</h3>
                <ol>
                  {saved.idea.buildPlan.map((step) => (
                    <li key={`${step.label}-${step.outcome}`}>
                      <strong>{step.label}</strong> — {step.outcome}
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}