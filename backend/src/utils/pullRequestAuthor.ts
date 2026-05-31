/** GitHub App / Dependabot / Renovate and other automated PR authors */
const KNOWN_BOT_LOGINS = new Set([
  "dependabot",
  "dependabot-preview",
  "renovate",
  "renovate-bot",
  "github-actions",
  "github-actions[bot]",
]);

/**
 * Returns true for Dependabot, GitHub Actions, and other non-human PR authors.
 */
export const isBotPullRequestAuthor = (
  author: string | null | undefined
): boolean => {
  if (!author) {
    return false;
  }

  const login = author.trim().toLowerCase();
  if (!login) {
    return false;
  }

  if (login.endsWith("[bot]")) {
    return true;
  }

  if (KNOWN_BOT_LOGINS.has(login)) {
    return true;
  }

  return false;
};

/**
 * Human-opened pull requests only (excludes Dependabot and similar bots).
 */
export const isUserPullRequestAuthor = (
  author: string | null | undefined
): boolean => !isBotPullRequestAuthor(author);
