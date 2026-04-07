// src/routes/aiRoutes.js

const express = require("express");
const {
  generateBlog,
  checkPendingDraft,
  discardPendingDraft,
} = require("../controllers/aiController");
const requireAuth = require("../middleware/authMiddleware");
const { aiLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

/**
 * @swagger
 * /api/ai/generate:
 *   post:
 *     summary: Generate an AI blog post from a GitHub repo 🔒
 *     description: |
 *       Uses Groq/Gemini AI to analyse a GitHub repository (README + recent commits) and generate
 *       a developer-focused blog post draft.
 *
 *       **Rate limit:** 3 requests / hour per user.
 *       **Daily limit:** 5 generations per user (resets at midnight UTC).
 *     tags: [AI]
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
 *                 description: GitHub username or organisation
 *                 example: johndoe
 *               repo:
 *                 type: string
 *                 description: Repository name
 *                 example: my-cool-project
 *     responses:
 *       200:
 *         description: Generated blog draft
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title: { type: string, example: "How I built my-cool-project" }
 *                 content: { type: string, example: "## Introduction\n..." }
 *                 tags:
 *                   type: array
 *                   items: { type: string }
 *                   example: [nodejs, open-source]
 *                 generationsLeft:
 *                   type: integer
 *                   description: Remaining daily generations for this user
 *                   example: 3
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Daily generation limit reached." }
 */
router.post("/generate", requireAuth, aiLimiter, generateBlog);

/**
 * @swagger
 * /api/ai/pending-draft:
 *   get:
 *     summary: Check for a pending AI draft 🔒
 *     description: |
 *       Checks whether a previous generation is still pending (e.g. user closed the tab
 *       mid-generation). Returns the draft data if one exists, or `null` if not.
 *     tags: [AI]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Pending draft or null
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Blog'
 *                 - type: object
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/pending-draft", requireAuth, checkPendingDraft);

/**
 * @swagger
 * /api/ai/pending-draft:
 *   delete:
 *     summary: Discard a pending AI draft 🔒
 *     description: Deletes the pending draft that was saved during a previous AI generation session.
 *     tags: [AI]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Draft discarded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Pending draft discarded." }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/pending-draft", requireAuth, discardPendingDraft);

module.exports = router;
