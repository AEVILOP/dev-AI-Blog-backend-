// src/routes/aiRoutes.js

const express = require("express");
const {
  generateBlog,
  checkPendingDraft,
  discardPendingDraft,
} = require("../controllers/aiController");
const requireAuth = require("../middleware/authMiddleware");
const { aiLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Generate — protected + strict rate limiter
router.post("/generate", requireAuth, aiLimiter, generateBlog);

// Pending draft — check if user closed the tab mid-generation
router.get("/pending-draft", requireAuth, checkPendingDraft);
router.delete("/pending-draft", requireAuth, discardPendingDraft);

module.exports = router;
