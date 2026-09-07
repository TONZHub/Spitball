import type { RunErrorCode } from "@/types/spitball";

const GITHUB_API_ROOT = "https://api.github.com";
const DEFAULT_TIMEOUT_MS = 12_000;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

type GitHubErrorCode = Extract<
  RunErrorCode,
  | "GITHUB_USER_NOT_FOUND"
  | "NO_ELIGIBLE_REPOSITORIES"
  | "GITHUB_RATE_LIMITED"
  | "GITHUB_UNAVAILABLE"
>;

export class GitHubProviderError extends Error {
  readonly code: GitHubErrorCode;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    code: GitHubErrorCode,
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "GitHubProviderError";
    this.code = code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

export type GitHubRequestOptions = {
  fetchImpl?: typeof fetch;
  token?: string;
  timeoutMs?: number;
};

export type GitHubRequest = <T>(path: string) => Promise<T>;

function githubHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "spitball-hackathon-app",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function errorForResponse(response: Response): GitHubProviderError {
  const status = response.status;
  const remaining = response.headers.get("x-ratelimit-remaining");
  if (status === 403 && remaining === "0") {
    return new GitHubProviderError(
      "GITHUB_RATE_LIMITED",
      "GitHub's request limit was reached. Try again after it resets.",
      { status, retryable: true },
    );
  }
  return new GitHubProviderError("GITHUB_UNAVAILABLE", "GitHub could not complete the request.", {
    status,
    retryable: RETRYABLE_STATUSES.has(status),
  });
}

export async function githubFetchJson<T>(
  path: string,
  options: GitHubRequestOptions = {},
): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = options.token ?? process.env.GITHUB_TOKEN?.trim();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = path.startsWith("https://") ? path : `${GITHUB_API_ROOT}${path}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: githubHeaders(token),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
      if (response.ok) return (await response.json()) as T;

      const providerError = errorForResponse(response);
      if (attempt === 0 && providerError.retryable) continue;
      throw providerError;
    } catch (error) {
      if (error instanceof GitHubProviderError) throw error;
      if (attempt === 0) continue;
      throw new GitHubProviderError(
        "GITHUB_UNAVAILABLE",
        "GitHub could not be reached. Try again.",
        { retryable: true, cause: error },
      );
    }
  }

  throw new GitHubProviderError("GITHUB_UNAVAILABLE", "GitHub could not complete the request.", {
    retryable: true,
  });
}

export function createGitHubRequest(options: GitHubRequestOptions = {}): GitHubRequest {
  return <T>(path: string) => githubFetchJson<T>(path, options);
}
