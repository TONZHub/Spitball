import { Buffer } from "node:buffer";

import { GitHubProviderError, createGitHubRequest, type GitHubRequest } from "./client";
import type { PortfolioRepository } from "@/types/spitball";

export const MAX_ANALYZED_REPOSITORIES = 25;
export const MAX_README_CHARACTERS = 10_000;
export const MAX_PORTFOLIO_CHARACTERS = 200_000;

type GitHubRepositoryResponse = {
  archived: boolean;
  description: string | null;
  fork: boolean;
  html_url: string;
  language: string | null;
  name: string;
  owner: { login: string };
  private: boolean;
  size: number;
  topics?: string[];
  updated_at: string;
};

type GitHubReadmeResponse = {
  content?: string;
  encoding?: string;
};

export type PortfolioResult = {
  consideredCount: number;
  repositories: PortfolioRepository[];
  evidenceLevel: "limited" | "standard";
  totalReadmeCharacters: number;
};

export type PortfolioOptions = {
  request?: GitHubRequest;
  onRepository?: (repository: Pick<PortfolioRepository, "name" | "url">) => void | Promise<void>;
};

function normalizeReadme(value: string): string {
  return value
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+$/gm, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function decodeReadme(response: GitHubReadmeResponse): string | null {
  if (response.encoding !== "base64" || !response.content) return null;
  try {
    return normalizeReadme(Buffer.from(response.content.replace(/\s/g, ""), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function eligibleRepository(repository: GitHubRepositoryResponse): boolean {
  return !repository.private && !repository.fork && !repository.archived && repository.size > 0;
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

export async function loadPublicPortfolio(
  username: string,
  options: PortfolioOptions = {},
): Promise<PortfolioResult> {
  const request = options.request ?? createGitHubRequest();
  let listed: GitHubRepositoryResponse[];

  try {
    listed = await request<GitHubRepositoryResponse[]>(
      `/users/${encodeSegment(username)}/repos?type=owner&sort=updated&direction=desc&per_page=100`,
    );
  } catch (error) {
    if (error instanceof GitHubProviderError && error.status === 404) {
      throw new GitHubProviderError(
        "GITHUB_USER_NOT_FOUND",
        "That GitHub username could not be found.",
        { status: 404 },
      );
    }
    throw error;
  }

  const candidates = listed
    .filter(eligibleRepository)
    .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
  const repositories: PortfolioRepository[] = [];
  let totalReadmeCharacters = 0;

  for (const repository of candidates) {
    if (
      repositories.length >= MAX_ANALYZED_REPOSITORIES ||
      totalReadmeCharacters >= MAX_PORTFOLIO_CHARACTERS
    ) {
      break;
    }

    let readmeResponse: GitHubReadmeResponse;
    try {
      readmeResponse = await request<GitHubReadmeResponse>(
        `/repos/${encodeSegment(repository.owner.login)}/${encodeSegment(repository.name)}/readme`,
      );
    } catch (error) {
      if (error instanceof GitHubProviderError && error.status === 404) continue;
      throw error;
    }

    const decoded = decodeReadme(readmeResponse);
    if (!decoded) continue;

    const perReadmeExcerpt = decoded.slice(0, MAX_README_CHARACTERS);
    const remaining = MAX_PORTFOLIO_CHARACTERS - totalReadmeCharacters;
    const readmeExcerpt = perReadmeExcerpt.slice(0, remaining);
    if (!readmeExcerpt) break;

    const normalized: PortfolioRepository = {
      owner: repository.owner.login,
      name: repository.name,
      url: repository.html_url,
      description: repository.description,
      updatedAt: repository.updated_at,
      language: repository.language,
      topics: repository.topics ?? [],
      readmeExcerpt,
      readmeTruncated: decoded.length > readmeExcerpt.length,
    };
    repositories.push(normalized);
    totalReadmeCharacters += readmeExcerpt.length;
    await options.onRepository?.({ name: normalized.name, url: normalized.url });
  }

  if (repositories.length === 0) {
    throw new GitHubProviderError(
      "NO_ELIGIBLE_REPOSITORIES",
      "Spitball needs at least one public repository with useful README content.",
    );
  }

  return {
    consideredCount: candidates.length,
    repositories,
    evidenceLevel: repositories.length <= 2 ? "limited" : "standard",
    totalReadmeCharacters,
  };
}
