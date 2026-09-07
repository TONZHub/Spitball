import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import { GitHubProviderError, type GitHubRequest } from "@/lib/github/client";
import {
  MAX_PORTFOLIO_CHARACTERS,
  MAX_README_CHARACTERS,
  loadPublicPortfolio,
} from "@/lib/github/portfolio";

type RepoOverrides = Partial<{
  archived: boolean;
  description: string | null;
  fork: boolean;
  language: string | null;
  name: string;
  private: boolean;
  size: number;
  topics: string[];
  updated_at: string;
}>;

function repo(name: string, overrides: RepoOverrides = {}) {
  return {
    archived: false,
    description: `${name} description`,
    fork: false,
    html_url: `https://github.com/tester/${name}`,
    language: "TypeScript",
    name,
    owner: { login: "tester" },
    private: false,
    size: 10,
    topics: [],
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function encodedReadme(content: string) {
  return { content: Buffer.from(content).toString("base64"), encoding: "base64" };
}

function mockRequest(repositories: ReturnType<typeof repo>[], readmes: Record<string, string>): GitHubRequest {
  return async <T>(path: string): Promise<T> => {
    if (path.startsWith("/users/")) return repositories as T;
    const match = path.match(/\/repos\/tester\/([^/]+)\/readme/);
    const name = match?.[1] ? decodeURIComponent(match[1]) : "";
    if (!(name in readmes)) {
      throw new GitHubProviderError("GITHUB_UNAVAILABLE", "README missing", { status: 404 });
    }
    return encodedReadme(readmes[name]) as T;
  };
}

describe("GitHub portfolio ingestion", () => {
  it("filters ineligible repositories, skips missing READMEs, and sorts recent first", async () => {
    const repositories = [
      repo("older", { updated_at: "2026-08-01T00:00:00Z" }),
      repo("newer", { updated_at: "2026-09-02T00:00:00Z" }),
      repo("fork", { fork: true }),
      repo("archived", { archived: true }),
      repo("empty", { size: 0 }),
      repo("private", { private: true }),
      repo("no-readme"),
    ];
    const seen: string[] = [];
    const result = await loadPublicPortfolio("tester", {
      request: mockRequest(repositories, { older: "old", newer: "new" }),
      onRepository: ({ name }) => {
        seen.push(name);
      },
    });

    expect(result.repositories.map(({ name }) => name)).toEqual(["newer", "older"]);
    expect(seen).toEqual(["newer", "older"]);
    expect(result.evidenceLevel).toBe("limited");
    expect(result.consideredCount).toBe(3);
  });

  it("caps each README at 10,000 characters", async () => {
    const result = await loadPublicPortfolio("tester", {
      request: mockRequest([repo("large")], { large: "x".repeat(MAX_README_CHARACTERS + 25) }),
    });
    expect(result.repositories[0].readmeExcerpt).toHaveLength(MAX_README_CHARACTERS);
    expect(result.repositories[0].readmeTruncated).toBe(true);
  });

  it("caps aggregate README content at 200,000 characters", async () => {
    const repositories = Array.from({ length: 25 }, (_, index) => repo(`repo-${index}`));
    const readmes = Object.fromEntries(
      repositories.map(({ name }) => [name, "x".repeat(MAX_README_CHARACTERS)]),
    );
    const result = await loadPublicPortfolio("tester", {
      request: mockRequest(repositories, readmes),
    });
    expect(result.totalReadmeCharacters).toBe(MAX_PORTFOLIO_CHARACTERS);
    expect(result.repositories).toHaveLength(20);
  });

  it("fails instead of generating for an empty eligible portfolio", async () => {
    await expect(
      loadPublicPortfolio("tester", {
        request: mockRequest([repo("fork", { fork: true })], {}),
      }),
    ).rejects.toMatchObject({ code: "NO_ELIGIBLE_REPOSITORIES" });
  });

  it("maps a missing user distinctly", async () => {
    const request: GitHubRequest = async () => {
      throw new GitHubProviderError("GITHUB_UNAVAILABLE", "Not found", { status: 404 });
    };
    await expect(loadPublicPortfolio("missing", { request })).rejects.toMatchObject({
      code: "GITHUB_USER_NOT_FOUND",
    });
  });
});
