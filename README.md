# ⚙️ Dev-AI-Blog Backend

> REST API powering **[DevBlog.AI](https://dev-ai-blog.vercel.app)** — an AI-assisted developer blogging platform that generates blog posts from your GitHub repositories.

---

## 📖 API Documentation

Interactive Swagger docs are available at:

**🔗 [https://dev-ai-blog-backend.onrender.com/api-docs](https://dev-ai-blog-backend.onrender.com/api-docs)**

The raw OpenAPI 3.0 JSON spec is available at `/api-docs.json`.

---

## 🌐 Live API

👉 https://dev-ai-blog-backend.onrender.com

---

## 📌 Overview

This backend provides the core infrastructure for the Dev-AI-Blog platform.

It handles:

* User authentication and authorization (via GitHub OAuth)
* Blog data management
* Integration with AI APIs (Groq/Gemini) for content generation
* Structured API request handling

---

## 🛠️ Tech Stack

| Layer     | Technology    |
| --------- | ------------- |
| Runtime   | Node.js       |
| Framework | Express.js    |
| Database  | MongoDB Atlas |
| Auth      | GitHub OAuth 2.0 + express-session |
| Docs      | Swagger UI (swagger-jsdoc + swagger-ui-express) |
| Security  | Rate Limiting + Helmet + CORS |
| AI        | Groq (primary) / Gemini (fallback) |
| Hosting   | Render        |

---

## 🗂️ API Endpoints Summary

| Tag | Method | Endpoint | Auth |
|---|---|---|---|
| **Health** | GET | `/health` | Public |
| **Auth** | GET | `/api/auth/github` | Public |
| **Auth** | GET | `/api/auth/github/full` | Public |
| **Auth** | GET | `/api/auth/github/callback` | Public |
| **Auth** | GET | `/api/auth/me` | 🔒 |
| **Auth** | POST | `/api/auth/logout` | 🔒 |
| **Blogs** | GET | `/api/blogs` | Public |
| **Blogs** | GET | `/api/blogs/:id` | Public |
| **Blogs** | GET | `/api/blogs/user/me` | 🔒 |
| **Blogs** | POST | `/api/blogs` | 🔒 |
| **Blogs** | PUT | `/api/blogs/:id` | 🔒 |
| **Blogs** | DELETE | `/api/blogs/:id` | 🔒 |
| **Blogs** | PATCH | `/api/blogs/:id/publish` | 🔒 |
| **AI** | POST | `/api/ai/generate` | 🔒 |
| **AI** | GET | `/api/ai/pending-draft` | 🔒 |
| **AI** | DELETE | `/api/ai/pending-draft` | 🔒 |
| **GitHub** | GET | `/api/github/repos` | 🔒 |
| **GitHub** | GET | `/api/github/repos/:owner/:repo/readme` | 🔒 |
| **GitHub** | GET | `/api/github/repos/:owner/:repo/commits` | 🔒 |
| **GitHub** | POST | `/api/github/validate-repo` | 🔒 |

> 🔒 = Requires a valid session cookie (set automatically after GitHub OAuth login).

---

## 🏗️ Project Structure

```
src/
├── server.js              — Express app: CORS, sessions, passport, routes, Swagger
├── config/
│   ├── db.js              — MongoDB connection with reconnect logging
│   ├── passport.js        — GitHub OAuth strategies + serialize/deserialize
│   └── swagger.js         — OpenAPI 3.0 spec definition
├── models/
│   ├── User.js            — isGenerating flag, pendingDraftId, daily counter
│   └── Blog.js            — isUnfinished flag, compound index on author+repoName
├── controllers/
│   ├── authController.js  — OAuth flow, getMe, logout with session destroy
│   ├── blogController.js  — Full CRUD + togglePublish
│   ├── githubController.js — Repos, readme, commits, validate
│   └── aiController.js    — Full AI generation pipeline
├── services/
│   ├── readmeService.js   — Injection patterns, template detection, smart extraction
│   ├── promptBuilder.js   — README delimiters, tone, variation instructions
│   ├── githubService.js   — Token expiry, rate limit, 404 handling
│   ├── groqService.js     — Groq API call
│   └── mistralService.js  — Mistral fallback
├── middleware/
│   ├── authMiddleware.js  — requireAuth guard
│   ├── rateLimiter.js     — Global / AI / auth limiters
│   ├── validateEnv.js     — Startup env var validation
│   └── errorHandler.js    — Mongoose errors, CastError, 500 fallback
└── routes/
    ├── authRoutes.js
    ├── blogRoutes.js
    ├── githubRoutes.js
    └── aiRoutes.js
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_uri
SESSION_SECRET=your_secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback
FRONTEND_URL=http://localhost:5173
GROQ_API_KEY=your_groq_api_key
```

---

## 🏗️ Installation & Run

```bash
git clone https://github.com/AEVILOP/dev-AI-Blog-backend.git
cd dev-AI-Blog-backend
npm install
npm run dev
```

Swagger UI will be available at **http://localhost:5000/api-docs**.

---

## ⚠️ Limitations

* In-memory rate limiting (not suitable for distributed systems without Redis store)
* Basic request validation
* No centralized remote logging

---

## 🤝 Contributing

Fork → Improve → Pull Request

---

## 📜 License

MIT License

---

## 👨‍💻 Author

**Anirban Banerjee**
https://github.com/AEVILOP

---

## ⭐ Support

Star the repo if you find it useful!
