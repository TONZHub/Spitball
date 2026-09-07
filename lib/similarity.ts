import type { ExcludedIdea, SpitballIdea } from "@/types/spitball";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "app",
  "for",
  "from",
  "in",
  "of",
  "on",
  "the",
  "to",
  "tool",
  "with",
]);

export function normalizeIdeaText(value: string): string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/[\s-]+/)
        .filter((word) => word.length > 1 && !STOP_WORDS.has(word)),
    ),
  ].sort();
}

export function jaccardSimilarity(left: string[], right: string[]): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);
  if (union.size === 0) return 0;

  let intersection = 0;
  for (const value of leftSet) {
    if (rightSet.has(value)) intersection += 1;
  }
  return intersection / union.size;
}

export function ideasAreSubstantiallySimilar(
  left: Pick<SpitballIdea | ExcludedIdea, "title" | "pitch" | "capabilityEquation">,
  right: Pick<SpitballIdea | ExcludedIdea, "title" | "pitch" | "capabilityEquation">,
): boolean {
  const leftTitle = normalizeIdeaText(left.title);
  const rightTitle = normalizeIdeaText(right.title);
  if (leftTitle.join(" ") === rightTitle.join(" ")) return true;

  const leftAll = normalizeIdeaText(`${left.title} ${left.pitch} ${left.capabilityEquation}`);
  const rightAll = normalizeIdeaText(`${right.title} ${right.pitch} ${right.capabilityEquation}`);

  return jaccardSimilarity(leftTitle, rightTitle) >= 0.75 || jaccardSimilarity(leftAll, rightAll) >= 0.72;
}

export function findIdeaCollision(
  ideas: SpitballIdea[],
  excludedIdeas: ExcludedIdea[] = [],
): { leftId: string; rightId: string } | null {
  const seen: Array<SpitballIdea | ExcludedIdea> = [...excludedIdeas];
  for (const idea of ideas) {
    const collision = seen.find((candidate) => ideasAreSubstantiallySimilar(idea, candidate));
    if (collision) return { leftId: idea.id, rightId: collision.id };
    seen.push(idea);
  }
  return null;
}
