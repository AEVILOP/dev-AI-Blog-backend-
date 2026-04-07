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

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth (public scope)
 *     description: |
 *       Redirects the user to GitHub to authorize the application with **public** scope
 *       (read access to public repos and profile). After authorization, GitHub redirects
 *       back to `/api/auth/github/callback`.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to GitHub authorization page
 */
router.get("/github", ...startGithubAuth("public", "github-public"));

/**
 * @swagger
 * /api/auth/github/full:
 *   get:
 *     summary: Initiate GitHub OAuth (full scope)
 *     description: |
 *       Redirects the user to GitHub to authorize the application with **repo** scope
 *       (read access to private repos). Required for generating blogs from private repositories.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to GitHub authorization page with expanded permissions
 */
router.get("/github/full", ...startGithubAuth("full", "github-full"));

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     description: |
 *       GitHub redirects here after the user grants (or denies) authorization.
 *       On success the user session is created and the browser is redirected to the frontend.
 *       On failure the browser is redirected with an `?error=` query parameter.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *         description: Temporary OAuth code issued by GitHub
 *       - in: query
 *         name: error
 *         schema: { type: string, enum: [access_denied] }
 *         description: Present when the user denies authorization
 *     responses:
 *       302:
 *         description: Redirect to frontend `/account` on success or `/login?error=…` on failure
 */
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

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user 🔒
 *     description: Returns the profile of the currently logged-in user based on their session cookie.
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out the current user 🔒
 *     description: Destroys the user's session and clears the session cookie.
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully.
 */
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
