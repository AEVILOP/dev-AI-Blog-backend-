// src/config/swagger.js
const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "DevBlog.AI – Backend API",
      version: "1.0.0",
      description:
        "REST API powering **DevBlog.AI** — an AI-assisted developer blogging platform.\n\n" +
        "Authentication is cookie-based (GitHub OAuth). Endpoints marked 🔒 require a valid session.\n\n" +
        "**Base URL (production):** `https://dev-ai-blog-backend.onrender.com`",
      contact: {
        name: "DevBlog.AI",
        url: "https://dev-ai-blog.vercel.app",
      },
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: "https://dev-ai-blog-backend.onrender.com",
        description: "Production",
      },
      {
        url: "http://localhost:5000",
        description: "Local development",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "devblog.sid",
          description:
            "Session cookie set automatically after GitHub OAuth login.",
        },
      },
      schemas: {
        Blog: {
          type: "object",
          properties: {
            _id: { type: "string", example: "663f1a2b3c4d5e6f7a8b9c0d" },
            title: { type: "string", example: "How I built a CLI tool in Go" },
            content: {
              type: "string",
              example: "## Introduction\nToday I want to share...",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              example: ["go", "cli", "open-source"],
            },
            isPublished: { type: "boolean", example: true },
            author: {
              type: "object",
              properties: {
                _id: { type: "string" },
                username: { type: "string", example: "johndoe" },
                avatarUrl: {
                  type: "string",
                  example: "https://avatars.githubusercontent.com/u/1234567",
                },
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-15T10:30:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-15T11:00:00.000Z",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string", example: "663f1a2b3c4d5e6f7a8b9c0d" },
            username: { type: "string", example: "johndoe" },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            avatarUrl: {
              type: "string",
              example: "https://avatars.githubusercontent.com/u/1234567",
            },
            githubUsername: { type: "string", example: "johndoe" },
            dailyGenerations: { type: "integer", example: 2 },
            lastGenerationDate: {
              type: "string",
              format: "date-time",
              example: "2025-01-15T10:00:00.000Z",
            },
            accessLevel: {
              type: "string",
              enum: ["public", "full"],
              example: "public",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2024-12-01T08:00:00.000Z",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string", example: "Not authenticated." },
            code: { type: "string", example: "UNAUTHENTICATED" },
          },
        },
      },
    },
    tags: [
      {
        name: "Auth",
        description: "GitHub OAuth login, session management, and current-user info",
      },
      { name: "Blogs", description: "Create, read, update, delete, and publish blogs" },
      {
        name: "AI",
        description: "AI-powered blog generation and draft management",
      },
      {
        name: "GitHub",
        description: "Fetch repos, README files, and commit history from GitHub",
      },
      { name: "Health", description: "Server liveness check" },
    ],
  },
  // Tell swagger-jsdoc where to find JSDoc @swagger annotations
  apis: [
    "./src/routes/*.js",
    "./src/server.js",
  ],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
