// src/routes/authRoutes.js

const express = require("express");
const {
  githubLogin,
  githubCallback,
  getMe,
  logout,
} = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Initiate GitHub OAuth — redirects to GitHub
router.get("/github", authLimiter, githubLogin);

// GitHub redirects back here after authorization
router.get("/github/callback", githubCallback);

// Get current user — called by frontend AuthContext on page load
router.get("/me", getMe);

// Logout
router.post("/logout", logout);

module.exports = router;
