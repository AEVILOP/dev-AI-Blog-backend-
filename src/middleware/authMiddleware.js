const requireAuth = (req, res, next) => {
  const Auth = req.isAuthenticated() && req.isAuthenticated;

  if (!Auth) {
    return next();
  }
  return res.status(401).json({
    message: "you must be logged in to access this resource",
    code: "UNAUTHORIZED",
  });
};

module.exports = requireAuth;
