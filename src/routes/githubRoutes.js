// src/routes/githubRoutes.js

const express = require("express");
const {
  getRepos,
  getReadme,
  getCommits,
  validateRepo,
} = require("../controllers/githubController");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

// All GitHub routes require authentication

/**
 * @swagger
 * /api/github/repos:
 *   get:
 *     summary: List authenticated user's GitHub repositories 🔒
 *     description: |
 *       Returns a list of public (and private, if the user granted full scope) GitHub repositories
 *       belonging to the authenticated user. Repos are fetched from the GitHub API using the user's
 *       stored OAuth token.
 *     tags: [GitHub]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of GitHub repository objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: integer, example: 123456789 }
 *                   name: { type: string, example: my-cool-project }
 *                   full_name: { type: string, example: johndoe/my-cool-project }
 *                   private: { type: boolean, example: false }
 *                   description: { type: string, example: A cool CLI tool written in Go }
 *                   html_url: { type: string, example: https://github.com/johndoe/my-cool-project }
 *                   language: { type: string, example: TypeScript }
 *                   stargazers_count: { type: integer, example: 42 }
 *                   updated_at: { type: string, format: date-time }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/repos", requireAuth, getRepos);

/**
 * @swagger
 * /api/github/repos/{owner}/{repo}/readme:
 *   get:
 *     summary: Get the README of a repository 🔒
 *     description: Fetches and decodes the raw README content of the specified GitHub repository.
 *     tags: [GitHub]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema: { type: string }
 *         description: GitHub username or organisation
 *         example: johndoe
 *       - in: path
 *         name: repo
 *         required: true
 *         schema: { type: string }
 *         description: Repository name
 *         example: my-cool-project
 *     responses:
 *       200:
 *         description: README content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 readme: { type: string, example: "# my-cool-project\nA fantastic project..." }
 *       401: { description: Not authenticated }
 *       404: { description: README not found }
 */
router.get("/repos/:owner/:repo/readme", requireAuth, getReadme);

/**
 * @swagger
 * /api/github/repos/{owner}/{repo}/commits:
 *   get:
 *     summary: Get recent commits for a repository 🔒
 *     description: Returns the most recent commits (up to 20) for the specified GitHub repository.
 *     tags: [GitHub]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema: { type: string }
 *         description: GitHub username or organisation
 *         example: johndoe
 *       - in: path
 *         name: repo
 *         required: true
 *         schema: { type: string }
 *         description: Repository name
 *         example: my-cool-project
 *     responses:
 *       200:
 *         description: Array of commit objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   sha: { type: string, example: abc123def456 }
 *                   message: { type: string, example: "feat: add dark mode" }
 *                   author: { type: string, example: johndoe }
 *                   date: { type: string, format: date-time }
 *       401: { description: Not authenticated }
 *       404: { description: Repository not found }
 */
router.get("/repos/:owner/:repo/commits", requireAuth, getCommits);

/**
 * @swagger
 * /api/github/validate-repo:
 *   post:
 *     summary: Validate that a repository exists and is accessible 🔒
 *     description: Checks whether the user has access to the given GitHub repository before generating a blog.
 *     tags: [GitHub]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [owner, repo]
 *             properties:
 *               owner:
 *                 type: string
 *                 example: johndoe
 *               repo:
 *                 type: string
 *                 example: my-cool-project
 *     responses:
 *       200:
 *         description: Repository is valid and accessible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid: { type: boolean, example: true }
 *                 repo:
 *                   type: object
 *                   properties:
 *                     name: { type: string }
 *                     full_name: { type: string }
 *                     private: { type: boolean }
 *       401: { description: Not authenticated }
 *       404:
 *         description: Repository not found or not accessible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/validate-repo", requireAuth, validateRepo);

module.exports = router;
