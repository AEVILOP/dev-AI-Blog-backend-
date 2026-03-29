// src/controllers/githubController.js

const {
  getUserRepos,
  getRepoReadme,
  getRepoCommits,
  validateRepoForGeneration,
} = require("../services/githubService");

const User = require("../models/User");

// Cache TTL — 10 minutes in milliseconds
const COMMIT_CACHE_TTL = 10 * 60 * 1000;

// Max cache entries per user — prevents the array growing forever
// Oldest entry removed when limit is hit
const MAX_CACHE_ENTRIES = 10;

// ── Shared GitHub error handler ───────────────────────────────────────────────
const handleGitHubErrors = (err, res, next) => {
  if (err.code === "GITHUB_TOKEN_EXPIRED") {
    return res.status(401).json({
      message: err.message,
      code: "GITHUB_TOKEN_EXPIRED",
      action: "RELOGIN",
    });
  }
  if (err.code === "GITHUB_RATE_LIMIT") {
    return res.status(429).json({
      message: err.message,
      code: "GITHUB_RATE_LIMIT",
    });
  }
  if (err.code === "GITHUB_ACCESS_DENIED") {
    return res.status(403).json({
      message: err.message,
      code: "GITHUB_ACCESS_DENIED",
    });
  }
  next(err);
};

// ── Cache helpers ─────────────────────────────────────────────────────────────

/**
 * Get cached commit data for a repo from the user document.
 * Returns null if no cache or cache is stale.
 */
const getCachedCommits = (user, cacheKey) => {
  if (!user.commitCache || user.commitCache.length === 0) return null;

  const entry = user.commitCache.find((c) => c.key === cacheKey);
  if (!entry) return null;

  const age = Date.now() - new Date(entry.cachedAt).getTime();
  if (age > COMMIT_CACHE_TTL) return null; // stale

  return entry.commits;
};

/**
 * Store commit data in user's cache.
 * Removes oldest entry if cache is full.
 * Saves to MongoDB.
 */
const setCachedCommits = async (user, cacheKey, commits) => {
  try {
    // Remove existing entry for this key if present
    user.commitCache = user.commitCache.filter((c) => c.key !== cacheKey);

    // Remove oldest entry if at max capacity
    if (user.commitCache.length >= MAX_CACHE_ENTRIES) {
      user.commitCache.sort(
        (a, b) => new Date(a.cachedAt) - new Date(b.cachedAt),
      );
      user.commitCache.shift(); // remove oldest
    }

    // Add new entry
    user.commitCache.push({
      key: cacheKey,
      commits,
      cachedAt: new Date(),
    });

    await user.save();
  } catch (err) {
    // Cache write failure is non-fatal — log and continue
    console.warn("Commit cache write failed:", err.message);
  }
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/github/repos
 */
exports.getRepos = async (req, res, next) => {
  try {
    const repos = await getUserRepos(req.user.githubAccessToken);
    res.json(repos);
  } catch (err) {
    handleGitHubErrors(err, res, next);
  }
};

/**
 * GET /api/github/repos/:owner/:repo/readme
 */
exports.getReadme = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;

    if (!owner || !repo || owner.includes("/") || repo.includes("/")) {
      return res.status(400).json({
        message: "Invalid repository owner or name.",
        code: "INVALID_PARAMS",
      });
    }

    const readme = await getRepoReadme(req.user.githubAccessToken, owner, repo);

    res.json({
      readme,
      hasReadme: readme !== null,
    });
  } catch (err) {
    handleGitHubErrors(err, res, next);
  }
};

/**
 * GET /api/github/repos/:owner/:repo/commits
 *
 * Returns:
 *   autoSelected  → top 15 commits auto-filtered by quality + position bonus
 *   all           → full raw list for manual selection UI
 *   qualityLevel  → 'high' | 'medium' | 'low'
 *                   frontend uses this to decide which UI state to show:
 *                   high   → silent auto mode, just show "12 commits selected"
 *                   medium → "5 commits found, want to add more?"
 *                   low    → "commit messages are brief, select manually or skip"
 *   total         → total commits in repo
 *   fromCache     → whether this response came from cache (for debugging)
 *
 * Caching:
 *   First call → 1 GitHub API call, result cached on user document for 10 min
 *   Subsequent calls within 10 min → returns cached data, 0 API calls
 */
exports.getCommits = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;

    if (!owner || !repo || owner.includes("/") || repo.includes("/")) {
      return res.status(400).json({
        message: "Invalid repository owner or name.",
        code: "INVALID_PARAMS",
      });
    }

    const cacheKey = `${owner}/${repo}`;
    const user = req.user;
    const cachedData = getCachedCommits(user, cacheKey);

    // Cache hit — return immediately, no GitHub API call
    if (cachedData) {
      return res.json({ ...cachedData, fromCache: true });
    }

    // Cache miss — fetch from GitHub
    const result = await getRepoCommits(
      req.user.githubAccessToken,
      owner,
      repo,
    );

    // Store in cache asynchronously — don't await, don't block response
    setCachedCommits(user, cacheKey, result).catch(() => {});

    res.json({ ...result, fromCache: false });
  } catch (err) {
    handleGitHubErrors(err, res, next);
  }
};

/**
 * POST /api/github/validate-repo
 */
exports.validateRepo = async (req, res, next) => {
  try {
    const { name, description, language } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Repository name is required." });
    }

    const result = validateRepoForGeneration({ name, description, language });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
