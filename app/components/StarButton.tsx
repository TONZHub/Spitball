"use client";

import { useEffect, useState } from "react";

import { isIdeaStarred, toggleStarredIdea } from "@/lib/starred";
import type { DraftIdea } from "@/types/spitball";

export function StarButton({
  username,
  topic,
  idea,
}: {
  username: string;
  topic?: string;
  idea: DraftIdea;
}) {
  const [starred, setStarred] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setStarred(isIdeaStarred(username, idea));
  }, [username, idea]);

  function toggle() {
    setError("");
    try {
      const result = toggleStarredIdea({ username, topic, idea });
      setStarred(result.starred);
    } catch (starError) {
      setError(starError instanceof Error ? starError.message : "That idea could not be starred.");
    }
  }

  return (
    <div className="star-control">
      <button
        className={`star-button ${starred ? "starred" : ""}`}
        type="button"
        aria-pressed={starred}
        onClick={toggle}
      >
        {starred ? "★ Starred" : "☆ Star idea"}
      </button>
      {error && <small className="star-error">{error}</small>}
    </div>
  );
}
