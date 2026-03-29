// src/routes/githubRoutes.js

const express = require("express");
const {
  getRepos,
  getReadme,
  getCommits,
  validateRepo,
} = require("../controllers/githubController");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

// All GitHub routes require authentication
router.get("/repos", requireAuth, getRepos);
router.get("/repos/:owner/:repo/readme", requireAuth, getReadme);
router.get("/repos/:owner/:repo/commits", requireAuth, getCommits);
router.post("/validate-repo", requireAuth, validateRepo);

module.exports = router;
