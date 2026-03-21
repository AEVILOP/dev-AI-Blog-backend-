const rateLimit = require("express-rate-limit");

// key generator for rate limiter

const getkey = (req) => {
  return req.user ? req.user.id : req.ip;
};

// global limiter
const globalLimiter = rateLimit({
  windowsMs: 15 * 60 * 1000,
  max: 200,
  standardheaders: true,
  legacyheaders: false,
  KeyGenerator: getkey,
  skip: (req) => req.path === "/health",
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many requests. slow down.",
      code: "RATE_LIMITED",
      retryAfter: 15 * 60 * 1000,
    });
  },
});

// AI limiter
const aiLimiter = rateLimit({
  windowsMs: 15 * 60 * 1000,
  max: 10,
  standardheaders: true,
  legacyheaders: false,
  KeyGenerator: getkey,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "AI limit request exceeded. Try again later.",
      code: "AI_RATE_LIMITED",
      retryAfter: 15 * 60 * 1000,
    });
  },
});

// Auth Limiter
const authLimiter = rateLimit({
  windowsMs: 15 * 60 * 1000,
  max: 10,
  standardheaders: true,
  legacyheaders: false,
  KeyGenerator: (req) => req.ip,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Auth limit request exceeded. Try again later.",
      code: "AUTH_RATE_LIMITED",
      retryAfter: 15 * 60 * 1000,
    });
  },
});

module.exports = {
  globalLimiter,
  aiLimiter,
  authLimiter,
};
