import type { DraftIdea, ExcludedIdea } from "@/types/spitball";

export const STARRED_STORAGE_KEY = "spitball.starred.v1";
export const MAX_STARRED_IDEAS = 50;

export type SavedIdea = {
  id: string;
  savedAt: string;
  username: string;
  topic?: string;
  idea: DraftIdea;
};

export function makeSavedIdeaId(username: string, idea: Pick<DraftIdea, "kind" | "title">): string {
  return `${username.trim().toLowerCase()}::${idea.kind}::${idea.title.trim().toLowerCase()}`;
}

function looksLikeSavedIdea(value: unknown): value is SavedIdea {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SavedIdea>;
  return Boolean(
    typeof record.id === "string" &&
      typeof record.savedAt === "string" &&
      typeof record.username === "string" &&
      record.idea &&
      typeof record.idea === "object" &&
      typeof record.idea.title === "string" &&
      typeof record.idea.pitch === "string" &&
      typeof record.idea.kind === "string" &&
      typeof record.idea.capabilityEquation === "string",
  );
}

export function readStarredIdeas(): SavedIdea[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STARRED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(looksLikeSavedIdea).slice(0, MAX_STARRED_IDEAS);
  } catch {
    return [];
  }
}

function writeStarredIdeas(items: SavedIdea[]): void {
  window.localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_STARRED_IDEAS)));
  window.dispatchEvent(new Event("spitball-starred-changed"));
}

export function isIdeaStarred(username: string, idea: DraftIdea): boolean {
  const id = makeSavedIdeaId(username, idea);
  return readStarredIdeas().some((item) => item.id === id);
}

export function toggleStarredIdea(input: {
  username: string;
  topic?: string;
  idea: DraftIdea;
}): { starred: boolean; items: SavedIdea[] } {
  const id = makeSavedIdeaId(input.username, input.idea);
  const current = readStarredIdeas();
  const existingIndex = current.findIndex((item) => item.id === id);

  if (existingIndex >= 0) {
    const next = current.filter((item) => item.id !== id);
    writeStarredIdeas(next);
    return { starred: false, items: next };
  }

  if (current.length >= MAX_STARRED_IDEAS) {
    throw new Error("Your star notebook is full. Remove one of the 50 saved ideas first.");
  }

  const saved: SavedIdea = {
    id,
    savedAt: new Date().toISOString(),
    username: input.username,
    topic: input.topic,
    idea: input.idea,
  };
  const next = [saved, ...current];
  writeStarredIdeas(next);
  return { starred: true, items: next };
}

export function removeStarredIdea(id: string): SavedIdea[] {
  const next = readStarredIdeas().filter((item) => item.id !== id);
  writeStarredIdeas(next);
  return next;
}

export function toExcludedIdeas(items: SavedIdea[]): ExcludedIdea[] {
  return items.map(({ id, idea }) => ({
    id,
    title: idea.title,
    pitch: idea.pitch,
    kind: idea.kind,
    capabilityEquation: idea.capabilityEquation,
  }));
}
