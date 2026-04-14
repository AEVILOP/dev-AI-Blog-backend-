<p align="center">
  <img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-LLaMA_3.3-FF6B35?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Gemini-1.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Swagger-OpenAPI_3.0-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" />
</p>

<h1 align="center">DevBlog.AI — Backend API</h1>

<p align="center">
  <strong>REST API powering DevBlog.AI — an AI-assisted developer blogging platform.</strong>
</p>

<p align="center">
  <a href="https://dev-ai-blog-backend.onrender.com/api-docs">📖 Live Swagger Docs</a> &nbsp;·&nbsp;
  <a href="https://dev-ai-blog.vercel.app">🔗 Frontend App</a> &nbsp;·&nbsp;
  <a href="https://dev-ai-blog-backend.onrender.com/health">❤️ Health Check</a>
</p>

---

> **See the [frontend README](https://github.com/AEVILOP/DevAIBlog) for the full project overview, screenshots, and architecture diagram.**

This is the backend service. It handles GitHub OAuth, repository data fetching, AI blog generation with dual-model fallback, and all CRUD operations.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in your keys
npm run dev             # starts on port 5000 with nodemon
```

## API Documentation

Interactive Swagger UI is live at `/api-docs` — see all endpoints, schemas, and try them directly.

**Base URL:** `https://dev-ai-blog-backend.onrender.com`

## Key Engineering Details

- **Dual AI fallback**: Groq (LLaMA 3.3 70B) primary → Gemini 1.5 Flash automatic fallback
- **12 edge cases** handled in the blog generation controller (concurrent requests, daily limits, tab-close recovery, malformed AI output, etc.)
- **Commit quality scoring**: Multi-signal algorithm filters noise, scores by prefix/length/keywords/position, deduplicates
- **README sanitization**: Prompt injection defense, template detection, section extraction, quality scoring
- **3-tier rate limiting**: Global (200/15min), AI (10/15min), Auth (10/15min)
- **Cookie-based sessions**: MongoStore persistence, cross-domain support (SameSite=None), 14-day TTL

## License

MIT
