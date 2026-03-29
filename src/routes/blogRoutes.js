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
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);

// ── Protected ─────────────────────────────────────────────────────────────────
// NOTE: /user/me must come BEFORE /:id so it doesn't get caught as an ID lookup
router.get("/user/me", requireAuth, getMyBlogs);
router.post("/", requireAuth, createBlog);
router.put("/:id", requireAuth, updateBlog);
router.delete("/:id", requireAuth, deleteBlog);
router.patch("/:id/publish", requireAuth, togglePublish);

module.exports = router;
