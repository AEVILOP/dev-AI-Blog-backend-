// src/middleware/validateEnv.js

const requiredEnvVars = [
  "MONGODB_URI",
  "SESSION_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "BACKEND_URL",
  "FRONTEND_URL"
];

const validateEnv = () => {
  const missing = [];
  requiredEnvVars.forEach((v) => {
    if (!process.env[v]) {
      missing.push(v);
    }
  });

  if (missing.length > 0) {
    console.error("--- CRITICAL ERROR: MISSING ENVIRONMENT VARIABLES ---");
    missing.forEach((v) => console.error(`- ${v}`));
    console.error("-----------------------------------------------------");
    process.exit(1);
  }
};

module.exports = validateEnv;
