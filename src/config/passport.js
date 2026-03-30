const passport = require("passport");
const GithubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

const createStrategyCallback = (accessLevel) => async (accessToken, refreshToken, profile, done) => {
  try {
    const githubId = profile.id?.toString();
    const username = profile.username || "developer";
    const githubUsername = profile.username || null;
    const email = profile.emails?.[0]?.value || null;
    const avatarUrl = profile.photos?.[0]?.value || null;

    if (!githubId) {
      return done(new Error("Github ID is required"), null);
    }

    let user = await User.findOne({ githubId });

    if (user) {
      user.githubAccessToken = accessToken;
      user.username = username;
      user.avatarUrl = avatarUrl;
      user.githubUsername = githubUsername;
      user.accessLevel = accessLevel;

      if (email && !user.email) user.email = email;

      await user.save();
    } else {
      user = await User.create({
        githubId,
        username,
        githubUsername,
        email,
        avatarUrl,
        githubAccessToken: accessToken,
        accessLevel
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
};

passport.use(
  'github-public',
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.BACKEND_URL 
        ? `${process.env.BACKEND_URL}/api/auth/github/callback` 
        : process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/auth/github/callback",
      scope: ["user:email", "read:user"],
    },
    createStrategyCallback('public')
  )
);

passport.use(
  'github-full',
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.BACKEND_URL 
        ? `${process.env.BACKEND_URL}/api/auth/github/callback` 
        : process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/auth/github/callback",
      scope: ["user:email", "read:user", "repo"],
    },
    createStrategyCallback('full')
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return done(null, false);
    }
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
});
