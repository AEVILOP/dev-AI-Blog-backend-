// src/routes/blogRoutes.js

const express = require("express");
const {
  getAllBlogs,
  getBlogById,
  getMyBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  togglePublish,
} = require("../controllers/blogController");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/blogs:
 *   get:
 *     summary: Get all published blogs
 *     description: Returns a paginated list of all publicly published blog posts, sorted by newest first.
 *     tags: [Blogs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Number of results per page
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Full-text search across title and tags
 *     responses:
 *       200:
 *         description: List of published blogs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blogs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Blog'
 *                 total:
 *                   type: integer
 *                   example: 42
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 pages:
 *                   type: integer
 *                   example: 5
 */
router.get("/", getAllBlogs);

/**
 * @swagger
 * /api/blogs/{id}:
 *   get:
 *     summary: Get a single blog by ID
 *     description: Returns full details of a single published blog post.
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the blog
 *         example: 663f1a2b3c4d5e6f7a8b9c0d
 *     responses:
 *       200:
 *         description: Blog post details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Blog'
 *       404:
 *         description: Blog not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", getBlogById);

// ── Protected ─────────────────────────────────────────────────────────────────
// NOTE: /user/me must come BEFORE /:id so it doesn't get caught as an ID lookup

/**
 * @swagger
 * /api/blogs/user/me:
 *   get:
 *     summary: Get the authenticated user's blogs 🔒
 *     description: |
 *       Returns all blog posts (published and unpublished drafts) belonging to the currently
 *       authenticated user.
 *     tags: [Blogs]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of the user's blogs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Blog'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/user/me", requireAuth, getMyBlogs);

/**
 * @swagger
 * /api/blogs:
 *   post:
 *     summary: Create a new blog post 🔒
 *     description: Creates a new blog post. The post is saved as a draft (`isPublished: false`) by default.
 *     tags: [Blogs]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 example: My first AI-generated blog
 *               content:
 *                 type: string
 *                 example: "## Introduction\nThis is my blog..."
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *                 example: [ai, nodejs]
 *               isPublished:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Blog created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Blog'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", requireAuth, createBlog);

/**
 * @swagger
 * /api/blogs/{id}:
 *   put:
 *     summary: Update a blog post 🔒
 *     description: Updates the title, content, or tags of a blog post. Only the owning user can update.
 *     tags: [Blogs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the blog
 *         example: 663f1a2b3c4d5e6f7a8b9c0d
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Updated blog
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Blog'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden – not the owner
 *       404:
 *         description: Blog not found
 */
router.put("/:id", requireAuth, updateBlog);

/**
 * @swagger
 * /api/blogs/{id}:
 *   delete:
 *     summary: Delete a blog post 🔒
 *     description: Permanently deletes a blog post. Only the owning user can delete.
 *     tags: [Blogs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the blog
 *         example: 663f1a2b3c4d5e6f7a8b9c0d
 *     responses:
 *       200:
 *         description: Blog deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Blog deleted. }
 *       401: { description: Not authenticated }
 *       403: { description: Forbidden – not the owner }
 *       404: { description: Blog not found }
 */
router.delete("/:id", requireAuth, deleteBlog);

/**
 * @swagger
 * /api/blogs/{id}/publish:
 *   patch:
 *     summary: Toggle publish status of a blog 🔒
 *     description: Toggles the `isPublished` flag between `true` and `false`. Only the owning user can toggle.
 *     tags: [Blogs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the blog
 *         example: 663f1a2b3c4d5e6f7a8b9c0d
 *     responses:
 *       200:
 *         description: Updated blog with new publish status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Blog'
 *       401: { description: Not authenticated }
 *       403: { description: Forbidden – not the owner }
 *       404: { description: Blog not found }
 */
router.patch("/:id/publish", requireAuth, togglePublish);

module.exports = router;
