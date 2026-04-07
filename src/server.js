require("dotenv").config();
const validateEnv = require("./middleware/validateEnv");

// Ensure all required environment variables are set before starting
validateEnv();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const connectMongo = require("connect-mongo");
const MongoStore = connectMongo.default || connectMongo;
const passport = require("passport");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const blogRoutes = require("./routes/blogRoutes");
const githubRoutes = require("./routes/githubRoutes");
const aiRoutes = require("./routes/aiRoutes");
const errorHandler = require("./middleware/errorHandler");
const { globalLimiter } = require("./middleware/rateLimiter");

// ── Passport strategy must be required to register it ──────────────────────
require("./config/passport");

const app = express();
const PORT = process.env.PORT || 5000;

console.log("--- DevBlog.AI Backend Booting ---");
console.log(`Port: ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`CORS Frontend URL: ${process.env.FRONTEND_URL}`);

// ── Connect to MongoDB ──────────────────────────────────────────────────────
connectDB();

// ── Security & Proxy ─────────────────────────────────────────────────────────
// Render/Vercel can sit behind multiple proxies, and secure cookies depend on this.
app.set("trust proxy", true);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Allow GitHub avatar images
        "img-src": [
          "'self'",
          "data:",
          "https://github.com",
          "https://*.githubusercontent.com",
        ],
        // Allow Swagger UI to load its inline scripts & styles
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'", "https:"],
      },
    },
  }),
);

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "https://dev-ai-blog.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Sessions ─────────────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60,
    }),
    proxy: true, // Tells express-session to trust the reverse proxy
    name: "devblog.sid",
    cookie: {
      httpOnly: true,
      secure: isProduction, // isProduction must be true for SameSite: None
      sameSite: isProduction ? "none" : "lax",
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
  }),
);

// ── Session Heartbeat (Debug) ────────────────────────────────────────────────
if (!isProduction) {
  app.use((req, res, next) => {
    console.log(`Session Initialized: ${!!req.session}`);
    if (req.session?.passport?.user) {
      console.log(`User in session: ${req.session.passport.user}`);
    }
    next();
  });
}

// ── Passport ─────────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Global rate limiter (applies to everything) ───────────────────────────
app.use(globalLimiter);

// ── Health check ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Server health check
 *     description: Returns a simple OK status and the current server timestamp. Use this to verify the API is reachable.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-01-15T10:30:00.000Z
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Swagger API Docs ──────────────────────────────────────────────────────────
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "DevBlog.AI – API Docs",
    customCss: `
      .swagger-ui .topbar { background-color: #0f172a; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info .title { color: #f97316; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
      filter: true,
      tagsSorter: "alpha",
    },
  }),
);

// Expose raw OpenAPI JSON for tooling / GitHub Pages hosting
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/ai", aiRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI → http://localhost:${PORT}/api-docs`);
});

module.exports = app;
