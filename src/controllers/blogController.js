// src/controllers/blogController.js

const Blog = require("../models/Blog");

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — no auth required
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/blogs
 * All published blogs with search, filter by language, and pagination.
 * Edge case: unfinished drafts are never shown in the public feed.
 */
exports.getAllBlogs = async (req, res, next) => {
  try {
    const { search, category, page = 1 } = req.query;
    const limit = 9;
    const skip = (Math.max(1, Number(page)) - 1) * limit;

    const query = {
      isPublished: true,
      isUnfinished: { $ne: true },
    };

    if (category && category !== "ALL") {
      query.repoLanguage = category;
    }

    if (search && search.trim()) {
      // Edge case: sanitize search to prevent regex injection
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { excerpt: { $regex: safeSearch, $options: "i" } },
        { repoName: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .populate("author", "username avatarUrl githubUsername")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(query),
    ]);

    res.json({
      blogs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/blogs/:id
 * Single published blog.
 * Edge case: unfinished blogs return 404 even if the ID is valid.
 */
exports.getBlogById = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate("author", "username avatarUrl githubUsername")
      .lean();

    if (!blog || !blog.isPublished || blog.isUnfinished) {
      return res.status(404).json({ message: "Blog not found." });
    }

    res.json(blog);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED — auth required
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/blogs/user/me
 * The current user's blogs including unpublished drafts.
 * Edge case: unfinished (mid-generation) blogs are excluded.
 */
exports.getMyBlogs = async (req, res, next) => {
  try {
    const blogs = await Blog.find({
      author: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(blogs);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/blogs
 * Save a completed blog after AI generation + user edits.
 * Edge case: content can be very long if user typed a lot in the editor.
 */
exports.createBlog = async (req, res, next) => {
  try {
    const {
      title,
      content,
      excerpt,
      repoName,
      repoUrl,
      repoLanguage,
      coverImage,
      category,
      tone,
    } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required." });
    }

    // Edge case: content length cap — Tiptap/rich editors can generate huge HTML
    const safeContent =
      content.length > 200000 ? content.substring(0, 200000) : content;

    const blog = await Blog.create({
      author: req.user._id,
      title: title.substring(0, 200),
      content: safeContent,
      excerpt: excerpt ? excerpt.substring(0, 400) : "",
      repoName: repoName ? repoName.substring(0, 100) : "",
      repoUrl: repoUrl || "",
      repoLanguage: repoLanguage || "",
      coverImage: coverImage || "",
      category: category || "",
      tone: ["casual", "professional"].includes(tone) ? tone : "casual",
      isPublished: false,
      isUnfinished: false,
    });

    res.status(201).json(blog);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/blogs/:id
 * Update a blog — owner only.
 * Edge case: user trying to update someone else's blog → 403.
 */
exports.updateBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found." });
    }

    // Ownership check
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You do not have permission to edit this blog.",
        code: "FORBIDDEN",
      });
    }

    // Whitelist — only allow updating these fields to prevent mass-assignment
    const allowed = [
      "title",
      "content",
      "excerpt",
      "coverImage",
      "category",
      "tone",
      "isPublished",
      "isUnfinished",
    ];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        blog[field] = req.body[field];
      }
    });

    await blog.save();
    res.json(blog);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/blogs/:id
 * Delete a blog — owner only.
 */
exports.deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found." });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You do not have permission to delete this blog.",
        code: "FORBIDDEN",
      });
    }

    await blog.deleteOne();
    res.json({ message: "Blog deleted successfully." });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/blogs/:id/publish
 * Toggle publish status — owner only.
 * Edge cases:
 * - unfinished blog cannot be published
 * - blog with no content cannot be published
 */
exports.togglePublish = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found." });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You do not have permission to publish this blog.",
        code: "FORBIDDEN",
      });
    }

    // Edge case: unfinished (mid-generation) blog cannot be published
    if (blog.isUnfinished) {
      return res.status(400).json({
        message: "This blog is incomplete and cannot be published.",
        code: "BLOG_UNFINISHED",
      });
    }

    // Edge case: blog with empty or very short content cannot be published
    if (!blog.content || blog.content.trim().length < 100) {
      return res.status(400).json({
        message:
          "Blog content is too short to publish. Please edit and expand the content first.",
        code: "CONTENT_TOO_SHORT",
      });
    }

    blog.isPublished = !blog.isPublished;
    await blog.save();

    res.json({
      isPublished: blog.isPublished,
      message: blog.isPublished
        ? "Blog published successfully."
        : "Blog unpublished.",
    });
  } catch (err) {
    next(err);
  }
};
