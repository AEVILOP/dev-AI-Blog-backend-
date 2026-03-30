const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// key generator for rate limiter

const getkey = (req, res) => {
  return req.user ? req.user.id : ipKeyGenerator(req, res);
};

// global limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getkey,
  skip: (req) => req.path === "/health",
  validate: { ip: false, trustProxy: false },
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
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getkey,
  validate: { ip: false, trustProxy: false },
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
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  validate: { ip: false, trustProxy: false },
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
