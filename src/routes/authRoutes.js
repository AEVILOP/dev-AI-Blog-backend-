// src/routes/authRoutes.js
const express = require("express");
const passport = require("passport");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const startGithubAuth = (scope, strategy) => [
  authLimiter,
  (req, res, next) => {
    req.session.authScope = scope;
    req.session.save((err) => {
      if (err) return next(err);
      return passport.authenticate(strategy)(req, res, next);
    });
  },
];

// Initiate GitHub Public Scope OAuth
router.get("/github", ...startGithubAuth("public", "github-public"));

// Initiate GitHub Full Scope OAuth
router.get("/github/full", ...startGithubAuth("full", "github-full"));

// GitHub Callback handling both strategies
router.get("/github/callback", (req, res, next) => {
  const tryAuth = (strategyName, fallBackStrategy = null) => {
    passport.authenticate(strategyName, (err, user, info) => {
      if (err) {
        if (err.message?.includes('denied') || req.query.error === 'access_denied') {
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=access_denied`);
        }
        if (fallBackStrategy) {
          return tryAuth(fallBackStrategy)(req, res, next);
        }
        console.error("GitHub OAuth error:", err.message);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
      }

      if (!user) {
        if (req.query.error === 'access_denied') {
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=access_denied`);
        }
        if (fallBackStrategy) {
          return tryAuth(fallBackStrategy)(req, res, next);
        }
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=access_denied`);
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Session login error:", loginErr.message);
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=session_failed`);
        }

        const redirectTo = req.session.returnTo || "/account";
        delete req.session.returnTo;

        return req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr.message);
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=session_failed`);
          }

          return res.redirect(`${process.env.FRONTEND_URL}${redirectTo}`);
        });
      });
    })(req, res, next);
  };

  // Determine intended strategy from session
  const intendedScope = req.session.authScope;
  delete req.session.authScope;

  if (intendedScope === 'full') {
    return tryAuth('github-full');
  }

  // Passport tries 'github-public' first, then 'github-full'
  tryAuth('github-public', 'github-full');
});

// Get current user
router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Not authenticated.",
      code: "UNAUTHENTICATED",
    });
  }

  const {
    _id,
    username,
    email,
    avatarUrl,
    githubUsername,
    dailyGenerations,
    lastGenerationDate,
    createdAt,
    accessLevel
  } = req.user;

  res.json({
    _id,
    username,
    email,
    avatarUrl,
    githubUsername,
    dailyGenerations,
    lastGenerationDate,
    createdAt,
    accessLevel
  });
});

// Logout
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Session destroy error:", destroyErr.message);
      }
      res.clearCookie("devblog.sid");
      res.json({ message: "Logged out successfully." });
    });
  });
});

module.exports = router;
