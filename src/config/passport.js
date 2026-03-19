const passport = require("passport");
const GithubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

passport.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ["user:email", "read:user", "repo"],
    },
    async (accessToken, sessionToken, profile, done) => {
      try {
        const githubId = profile.id?.toString();
        const username = profile.username || profile.username || "developer";
        const githubUsername = profile.username || null;
        const email = profile.emails?.[0]?.value || null;
        const avatarURL = profile.photos?.[0]?.value || null;
        const accessToken = accessToken || null;

        if (!githubId) {
          return done(new Error("Github ID is required"), null);
        }

        let user = await User.findOne({ githubId });

        if (user) {
          // update the profile data every time when login
          // edge case : if user may have revoked or re-authorized the app
          // we need to update the access token

          user.githubAccesstoken = accessToken;
          user.username = username;
          user.avatarURL = avatarURL;
          user.githubUsername = githubUsername;

          if (email && !user.email) user.email = email;

          await user.save();
        } else {
          user = await User.create({
            githubId,
            username,
            githubUsername,
            email,
            avatarURL,
            githubAccesstoken: accessToken,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    },
  ),
);

//  authentication  finished
// now we have to serialize and deserialize the user
// here we store the user id in the session

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
