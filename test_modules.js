// Quick test: load each module individually to find which one crashes
require("dotenv").config();

const tests = [
  ["mongoose", () => require("mongoose")],
  ["express", () => require("express")],
  ["cors", () => require("cors")],
  ["helmet", () => require("helmet")],
  ["express-session", () => require("express-session")],
  ["connect-mongo", () => require("connect-mongo")],
  ["passport", () => require("passport")],
  ["express-rate-limit", () => require("express-rate-limit")],
  ["db config", () => require("./src/config/db")],
  ["passport config", () => require("./src/config/passport")],
  ["User model", () => require("./src/models/User")],
  ["Blog model", () => require("./src/models/Blog")],
  ["authMiddleware", () => require("./src/middleware/authMiddleware")],
  ["errorHandler", () => require("./src/middleware/errorHandler")],
  ["rateLimiter", () => require("./src/middleware/rateLimiter")],
  ["readmeService", () => require("./src/services/readmeService")],
  ["promptBuilder", () => require("./src/services/promptBuilder")],
  ["groqService", () => require("./src/services/groqService")],
  ["geminiService", () => require("./src/services/geminiService")],
  ["githubService", () => require("./src/services/githubService")],
  ["aiController", () => require("./src/controllers/aiController")],
  ["authController", () => require("./src/controllers/authController")],
  ["blogController", () => require("./src/controllers/blogController")],
  ["githubController", () => require("./src/controllers/githubController")],
  ["authRoutes", () => require("./src/routes/authRoutes")],
  ["blogRoutes", () => require("./src/routes/blogRoutes")],
  ["aiRoutes", () => require("./src/routes/aiRoutes")],
  ["githubRoutes", () => require("./src/routes/githubRoutes")],
];

for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`OK: ${name}`);
  } catch (e) {
    console.log(`FAIL: ${name} -> ${e.message}`);
    console.log(`  Stack: ${e.stack.split('\n').slice(0, 3).join('\n  ')}`);
  }
}

console.log("\nDone testing modules.");
