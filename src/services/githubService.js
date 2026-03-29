// src/services/githubService.js

const axios = require("axios");

// ── Axios instance ───────────────────────────────────────────────────────────
const githubAPI = (token) =>
  axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
    timeout: 10000,
  });

// ── Error Handler ────────────────────────────────────────────────────────────
const handleGitHubError = (err, context) => {
  if (err.response?.status === 401) {
    const error = new Error("GitHub token expired. Please log in again.");
    error.status = 401;
    error.code = "GITHUB_TOKEN_EXPIRED";
    throw error;
  }

  if (err.response?.status === 403) {
    const remaining = err.response.headers["x-ratelimit-remaining"];

    if (remaining === "0") {
      const error = new Error(
        "GitHub API rate limit reached. Try again later.",
      );
      error.status = 429;
      error.code = "GITHUB_RATE_LIMIT";
      throw error;
    }

    const error = new Error("Access denied to this repository.");
    error.status = 403;
    error.code = "GITHUB_ACCESS_DENIED";
    throw error;
  }

  if (err.response?.status === 404) {
    const error = new Error(`GitHub resource not found: ${context}`);
    error.status = 404;
    error.code = "GITHUB_NOT_FOUND";
    throw error;
  }

  throw err;
};

// ── Commit Filtering Logic ───────────────────────────────────────────────────

const NOISE_PATTERNS = [
  /^merge/i,
  /^revert/i,
  /^bump/i,
  /^chore/i,
  /^style/i,
  /^format/i,
];

const IMPORTANT_PREFIXES = ["feat", "fix", "refactor", "perf"];
const SOFT_PREFIXES = ["docs", "test"];

const USEFUL_KEYWORDS = ["auth", "api", "database", "login"];

// Normalize commit message
const normalizeMessage = (msg) => {
  return msg?.split("\n")[0]?.trim() || "";
};

// Noise detection (improved)
const isNoise = (msg) => {
  if (!msg) return true;

  const lower = msg.toLowerCase();

  if (NOISE_PATTERNS.some((p) => p.test(lower))) return true;

  // smarter short message handling
  if (lower.length < 8 && !/(fix|feat|auth|api|login)/.test(lower)) {
    return true;
  }

  return false;
};

// Position bonus (kept from your strong logic)
const getPositionBonus = (index, total) => {
  const position = index / total;

  if (position >= 0.8) return 5;
  if (position >= 0.2) return 1;
  return 0;
};

// Scoring system (balanced)
const scoreCommit = (msg, positionBonus = 0) => {
  if (!msg) return 0;

  const lower = msg.toLowerCase();
  let score = 0;

  // Prefix scoring
  const colonIdx = lower.indexOf(":");
  if (colonIdx > 0) {
    const prefix = lower.substring(0, colonIdx).trim();

    if (IMPORTANT_PREFIXES.includes(prefix)) score += 12;
    else if (SOFT_PREFIXES.includes(prefix)) score += 3;
    else score += 1;
  }

  // Length scoring
  if (msg.length >= 50) score += 4;
  else if (msg.length >= 20) score += 2;

  // Keyword scoring (capped)
  let keywordScore = 0;
  USEFUL_KEYWORDS.forEach((kw) => {
    if (lower.includes(kw)) keywordScore += 3;
  });
  score += Math.min(keywordScore, 6);

  // Penalties
  if (lower.includes("typo")) score -= 5;
  if (lower.includes("minor")) score -= 3;
  if (lower.includes("small")) score -= 2;

  if (lower === "update" || lower === "fix") score -= 5;

  // Position bonus
  score += positionBonus;

  return score;
};

// Deduplication (improved)
const deduplicate = (commits) => {
  const seen = new Set();

  return commits.filter((c) => {
    const key = c.message
      .toLowerCase()
      .replace(/^[a-z]+:\s*/, "") // remove prefix
      .replace(/[^a-z0-9 ]/g, "")
      .split(/\s+/)
      .slice(0, 5)
      .join(" ");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Commit quality detection
const detectCommitQuality = (commits) => {
  if (!commits || commits.length === 0) return "low";

  const meaningful = commits.filter((c) => {
    const msg = c.commit?.message || "";
    return !isNoise(msg);
  }).length;

  const ratio = meaningful / commits.length;

  if (ratio >= 0.4) return "high";
  if (ratio >= 0.2) return "medium";
  return "low";
};

// Main commit pipeline
const autoFilterCommits = (rawCommits) => {
  const MAX_AUTO = 15;
  const total = rawCommits.length;

  const processed = rawCommits
    .map((c, index) => {
      const message = normalizeMessage(c.commit?.message);
      const positionBonus = getPositionBonus(index, total);

      return {
        sha: c.sha,
        message,
        author: c.commit?.author?.name || "",
        date: c.commit?.author?.date || "",
        score: scoreCommit(message, positionBonus),
        isNoise: isNoise(message),
      };
    })
    .filter((c) => c.message.length > 0); // Fix 4

  // Filter AFTER scoring (important)
  const filtered = processed.filter((c) => !c.isNoise || c.score > 5);

  const deduped = deduplicate(filtered);

  return {
    autoSelected: deduped.sort((a, b) => b.score - a.score).slice(0, MAX_AUTO),

    all: processed,
  };
};

// ── API FUNCTIONS ────────────────────────────────────────────────────────────

// Get user repos
exports.getUserRepos = async (token) => {
  try {
    const { data } = await githubAPI(token).get(
      "/user/repos?per_page=100&sort=updated&affiliation=owner",
    );

    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description ? repo.description.substring(0, 500) : null,
      language: repo.language,
      stars: repo.stargazers_count,
      url: repo.html_url,
      updatedAt: repo.updated_at,
      isPrivate: repo.private,
      owner: repo.owner.login,
    }));
  } catch (err) {
    handleGitHubError(err, "user repos");
  }
};

// Get README
exports.getRepoReadme = async (token, owner, repo) => {
  try {
    const { data } = await githubAPI(token).get(
      `/repos/${owner}/${repo}/readme`,
    );
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch (err) {
    if (err.response?.status === 404) return null;
    handleGitHubError(err, `readme for ${owner}/${repo}`);
  }
};

// Get commits
exports.getRepoCommits = async (token, owner, repo) => {
  try {
    const { data: commitList } = await githubAPI(token).get(
      `/repos/${owner}/${repo}/commits?per_page=100`,
    );

    if (!commitList || commitList.length === 0) {
      return { autoSelected: [], all: [], qualityLevel: "low", total: 0 };
    }

    const qualityLevel = detectCommitQuality(commitList);
    const { autoSelected, all } = autoFilterCommits(commitList);

    return {
      autoSelected,
      all,
      qualityLevel,
      total: commitList.length,
    };
  } catch (err) {
    if (err.response?.status === 401) handleGitHubError(err, "commits");
    if (err.response?.status === 403) handleGitHubError(err, "commits");

    console.warn(`Commit fetch failed for ${owner}/${repo}:`, err.message);

    return { autoSelected: [], all: [], qualityLevel: "low", total: 0 };
  }
};

// Repo validation
exports.validateRepoForGeneration = (repo) => {
  if (!repo.name || repo.name.trim().length === 0) {
    return { valid: false, reason: "Repository has no name." };
  }

  if (repo.name.length <= 2 && !repo.description && !repo.language) {
    return {
      valid: false,
      reason: "Repository has too little information.",
    };
  }

  return { valid: true, reason: null };
};
