// src/controllers/authController.js

const passport = require("passport");

/**
 * Initiate GitHub OAuth flow.
 * Redirects user to GitHub's authorization page.
 */
exports.githubLogin = passport.authenticate("github", {
  scope: ["user:email", "read:user"],
});

/**
 * GitHub OAuth callback.
 * GitHub redirects here after user authorizes (or denies) access.
 *
 * Edge cases handled:
 * - User denies access on GitHub → redirect with error
 * - Passport strategy fails (network error, invalid token) → redirect with error
 * - Successful auth → redirect to frontend
 */
exports.githubCallback = (req, res, next) => {
  passport.authenticate("github", (err, user, info) => {
    if (err) {
      console.error("GitHub OAuth error:", err.message);
      // Redirect to frontend login with error flag so UI can show a message
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
      );
    }

    if (!user) {
      // Edge case: user clicked "Deny" on GitHub
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=access_denied`,
      );
    }

    // Log the user in — creates the session
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error("Session login error:", loginErr.message);
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=session_failed`,
        );
      }

      // Edge case: if user was in the middle of something before login
      // redirect to where they were, or default to home
      const redirectTo = req.session.returnTo || "/";
      delete req.session.returnTo;

      return res.redirect(`${process.env.FRONTEND_URL}${redirectTo}`);
    });
  })(req, res, next);
};

/**
 * Get the currently authenticated user.
 * Called by frontend on every page load via AuthContext.
 *
 * Edge case: returns 401 if not logged in — frontend uses this to
 * determine auth state without crashing.
 */
exports.getMe = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Not authenticated.",
      code: "UNAUTHENTICATED",
    });
  }

  // Never return the GitHub access token to the frontend
  const {
    _id,
    username,
    email,
    avatarUrl,
    githubUsername,
    dailyGenerations,
    lastGenerationDate,
    createdAt,
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
  });
};

/**
 * Log the user out.
 * Destroys the session and clears the cookie.
 *
 * Edge case: calling logout when already logged out is safe — just return success.
 */
exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    // Fully destroy the session rather than just removing the user from it
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Session destroy error:", destroyErr.message);
        // Non-fatal — user is logged out even if session destroy has a hiccup
      }

      // Clear the session cookie from the browser
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully." });
    });
  });
};
