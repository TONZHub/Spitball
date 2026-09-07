import { loadPublicPortfolio } from "../lib/github/portfolio";

const username = process.argv[2] ?? "TONZHub";

try {
  const result = await loadPublicPortfolio(username);
  console.log(
    JSON.stringify(
      {
        username,
        consideredCount: result.consideredCount,
        analyzedCount: result.repositories.length,
        evidenceLevel: result.evidenceLevel,
        totalReadmeCharacters: result.totalReadmeCharacters,
        repositories: result.repositories.map((repository) => ({
          name: repository.name,
          url: repository.url,
          characters: repository.readmeExcerpt.length,
          truncated: repository.readmeTruncated,
        })),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : "GitHub smoke test failed");
  process.exitCode = 1;
}
