"use client";

import { useEffect, useState } from "react";

const loadingLines = [
  "Reading the receipts from GitHub...",
  "Stripping old project shapes off the useful parts...",
  "DeepSeek is being asked to make a questionable leap...",
  "Checking whether the questionable leap is actually buildable...",
  "GLM has the clipboard and is asking for evidence...",
  "Still cooking. The ideas are taking the scenic route...",
];

const badIdeas = [
  "An AI to-do list that sends you more notifications.",
  "A dashboard for managing all of your other dashboards.",
  "LinkedIn, but every user is a chatbot.",
  "A blockchain toothbrush streak tracker.",
  "Uber, but for finding the TV remote.",
  "A subscription service that emails motivational PDFs.",
  "Tinder for choosing a database.",
  "A smart fridge social network for leftovers.",
];

export function LoadingLab() {
  const [seconds, setSeconds] = useState(0);
  const [shredIndex, setShredIndex] = useState(0);
  const [shredded, setShredded] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const lineIndex = Math.min(Math.floor(seconds / 7), loadingLines.length - 1);

  function shredBadIdea() {
    setShredded((value) => value + 1);
    setShredIndex((value) => (value + 1) % badIdeas.length);
  }

  return (
    <div className="loading-lab">
      <div className="loading-status" role="status" aria-live="polite">
        <p className="loading-kicker">Spitball is cooking · {seconds}s</p>
        <p className="loading-line">{loadingLines[lineIndex]}</p>
        <p className="loading-disclaimer">The messages rotate with time; they are loading theater, not fake telemetry.</p>
      </div>

      <div className="shredder-game">
        <div className="shredder-heading">
          <span>BAD IDEA SHREDDER</span>
          <span>{shredded} destroyed</span>
        </div>
        <div className="bad-idea-card" key={shredIndex}>
          {badIdeas[shredIndex]}
        </div>
        <button className="shred-button" type="button" onClick={shredBadIdea}>
          SHRED IT
        </button>
        <small>This does not affect the results. It merely improves morale.</small>
      </div>
    </div>
  );
}
