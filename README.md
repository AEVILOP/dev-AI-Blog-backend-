src/
├── server.js              — express, cors, sessions, passport, routes
├── config/
│   ├── db.js              — MongoDB with reconnect logging
│   └── passport.js        — GitHub OAuth strategy + serialize/deserialize
├── models/
│   ├── User.js            — isGenerating flag, pendingDraftId, daily counter
│   └── Blog.js            — isUnfinished flag, compound index on author+repoName
├── controllers/
│   ├── authController.js  — OAuth flow, getMe, logout with session destroy
│   ├── blogController.js  — full CRUD + togglePublish
│   ├── githubController.js — repos, readme, validate
│   └── aiController.js    — full generation pipeline
├── services/
│   ├── readmeService.js   — injection patterns, template detection, smart extraction
│   ├── promptBuilder.js   — README delimiters, tone, variation instructions
│   ├── githubService.js   — token expiry, rate limit, 404 handling
│   ├── groqService.js     — Groq API call
│   └── mistralService.js  — Mistral fallback
├── middleware/
│   ├── authMiddleware.js  — requireAuth guard
│   ├── rateLimiter.js     — global / AI / auth limiters
│   └── errorHandler.js    — Mongoose errors, CastError, 500 fallback
└── routes/ (4 files)
