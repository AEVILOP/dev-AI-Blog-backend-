// src/controllers/aiController.js

const buildPrompt = require("../services/promptBuilder");
const generateWithGroq = require("../services/groqService");
const generateWithGemini = require("../services/geminiService");
const { processReadme } = require("../services/readmeService");
const User = require("../models/User");
const Blog = require("../models/Blog");

// ── JSON parser ───────────────────────────────────────────────────────────────
/**
 * Parse AI response safely.
 * Edge cases:
 * - AI wraps response in ```json fences
 * - AI adds explanation text before or after the JSON object
 * - AI produces trailing commas or control characters in JSON
 */
const parseAIResponse = (raw) => {
  if (!raw || typeof raw !== "string") {
    throw new Error("AI returned an empty response");
  }

  // Strip markdown code fences if present
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Find the bounds of the actual JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response contained no valid JSON object");
  }

  const jsonString = cleaned.substring(start, end + 1);

  try {
    return JSON.parse(jsonString);
  } catch {
    // Last resort — try to fix common AI JSON mistakes
    const fixed = jsonString
      .replace(/,\s*}/g, "}") // trailing commas in objects
      .replace(/,\s*]/g, "]") // trailing commas in arrays
      .replace(/[\x00-\x1F\x7F]/g, " "); // control characters inside strings
    return JSON.parse(fixed);
  }
};

// ── Blog quality validator ────────────────────────────────────────────────────
/**
 * Validate that the AI-generated blog meets quality standards.
 * Edge cases:
 * - AI returns blog that is too short (under 300 words)
 * - AI returns response with missing required fields
 */
const validateBlogOutput = (blog) => {
  const required = [
    "title",
    "excerpt",
    "intro",
    "whatItDoes",
    "techStack",
    "developmentJourney",
    "challenges",
    "gettingStarted",
    "conclusion",
  ];

  for (const field of required) {
    if (
      !blog[field] ||
      typeof blog[field] !== "string" ||
      blog[field].trim().length === 0
    ) {
      throw new Error(`AI response missing required field: ${field}`);
    }
  }

  // Check total word count across all fields
  const allText = Object.values(blog).join(" ");
  const wordCount = allText.split(/\s+/).filter(Boolean).length;

  if (wordCount < 300) {
    throw new Error(`AI response too short: ${wordCount} words (minimum 300)`);
  }

  return true;
};

// ── Daily limit helper ────────────────────────────────────────────────────────
/**
 * Check and reset the daily generation counter if it's a new calendar day.
 * Returns the current count after potentially resetting it.
 */
const checkAndResetDailyLimit = async (user) => {
  const today = new Date().toDateString();
  const lastDate = user.lastGenerationDate
    ? new Date(user.lastGenerationDate).toDateString()
    : null;

  if (lastDate !== today) {
    user.dailyGenerations = 0;
    user.lastGenerationDate = new Date();
    await user.save();
  }

  return user.dailyGenerations;
};

// ── Cleanup helper ────────────────────────────────────────────────────────────
/**
 * Always reset isGenerating flag, even if generation crashed.
 * This prevents the user getting stuck permanently locked out.
 */
const cleanupAfterGeneration = async (user) => {
  try {
    user.isGenerating = false;
    await user.save();
  } catch (err) {
    console.error("Failed to reset isGenerating flag:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CONTROLLER: generateBlog
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a blog post from a GitHub repository.
 *
 * Edge cases handled in order:
 * 1. Missing / invalid input
 * 2. Two simultaneous generation requests from same user
 * 3. Daily generation limit (5/day, resets at midnight)
 * 4. Regeneration limit (max 3 per blog)
 * 5. Duplicate blog for the same repo
 * 6. Template README (boilerplate, nothing useful)
 * 7. Pending draft saved to DB BEFORE calling AI (survives tab close)
 * 8. Groq fails → auto-fallback to Gemini
 * 9. Both AI services fail → clean error
 * 10. AI returns malformed JSON → fix attempts
 * 11. AI output too short → retry once with explicit instruction
 * 12. On any error → always reset isGenerating flag
 */
exports.generateBlog = async (req, res, next) => {
  const user = req.user;
  let generationStarted = false;

  try {
    const {
      repoName,
      description,
      language,
      readme: rawReadme,
      tone = "casual",
      isRegeneration = false,
      regenerateCount = 0,
      repoUrl = "",
      coverImage = "",
      commits = [],
    } = req.body;

    // ── 1. Basic input validation ─────────────────────────────────────────────

    if (
      !repoName ||
      typeof repoName !== "string" ||
      repoName.trim().length === 0
    ) {
      return res.status(400).json({ message: "Repository name is required." });
    }

    if (!["casual", "professional"].includes(tone)) {
      return res
        .status(400)
        .json({ message: "Tone must be casual or professional." });
    }

    // ── 2. Concurrent request guard ──────────────────────────────────────────
    // Edge case: user opens two tabs and clicks Generate in both at the same time

    if (user.isGenerating) {
      return res.status(409).json({
        message:
          "A blog is already being generated for your account. Please wait.",
        code: "ALREADY_GENERATING",
      });
    }

    // ── 3. Daily generation limit ────────────────────────────────────────────

    const currentCount = await checkAndResetDailyLimit(user);

    if (!isRegeneration && currentCount >= 10) {
      return res.status(429).json({
        message:
          "You have reached your daily limit of 10 blog generations. Come back tomorrow.",
        code: "DAILY_LIMIT_REACHED",
        resetsAt: "midnight",
      });
    }

    // ── 4. Regeneration limit ─────────────────────────────────────────────────

    if (isRegeneration && regenerateCount >= 3) {
      return res.status(429).json({
        message: "Maximum 3 regenerations allowed per blog.",
        code: "REGEN_LIMIT_REACHED",
      });
    }

    // ── 5. Duplicate blog check ───────────────────────────────────────────────
    // Edge case: user already has a blog for this repo and tries to generate again

    if (!isRegeneration) {
      const existingBlog = await Blog.findOne({
        author: user._id,
        repoName: repoName.trim(),
      });

      if (existingBlog) {
        return res.status(409).json({
          message: `You already have a blog for "${repoName}". Edit the existing one or delete it first.`,
          code: "DUPLICATE_REPO_BLOG",
          existingBlogId: existingBlog._id,
        });
      }
    }

    // ── 6. Process README ─────────────────────────────────────────────────────
    // Sanitize, extract smart content, detect template

    const { content: processedReadme, warning: readmeWarning } =
      processReadme(rawReadme);

    if (readmeWarning === "TEMPLATE_README") {
      return res.status(400).json({
        message:
          "Your README appears to be a default template with no real content. Please update it before generating.",
        code: "TEMPLATE_README",
      });
    }

    // ── Lock user to prevent concurrent requests ──────────────────────────────

    user.isGenerating = true;
    await user.save();
    generationStarted = true;

    // ── 7. Create pending draft BEFORE calling AI ─────────────────────────────
    // Edge case: user closes the tab mid-generation
    // The draft is saved to DB so next visit shows "You have an unfinished blog"

    let pendingBlog = null;

    if (!isRegeneration) {
      pendingBlog = await Blog.create({
        author: user._id,
        title: `Draft — ${repoName}`,
        content: "",
        excerpt: "",
        repoName: repoName.trim().substring(0, 100),
        repoUrl: repoUrl,
        repoLanguage: language || "",
        coverImage: coverImage,
        category: language || "",
        tone,
        isPublished: false,
        isUnfinished: true, // key flag — marks this as incomplete
      });

      user.pendingDraftId = pendingBlog._id;
      await user.save();
    }

    // ── Build prompt (server-side — never sent to frontend) ───────────────────

    const prompt = buildPrompt({
      repoName: repoName.trim(),
      description: description ? description.substring(0, 500) : "",
      language: language || "",
      readme: processedReadme,
      commits: Array.isArray(commits) ? commits.slice(0, 20) : [],
      tone,
      isRegeneration,
      regenerationCount: regenerateCount,
    });

    // ── 8 & 9. Call AI — Groq first, Gemini fallback, error if both fail ─────

    let rawResponse;
    let usedModel = "groq";

    try {
      rawResponse = await generateWithGroq(prompt);
    } catch (groqErr) {
      console.warn("Groq failed, switching to Gemini:", groqErr.message);
      try {
        usedModel = "gemini";
        rawResponse = await generateWithGemini(prompt);
      } catch (geminiErr) {
        throw new Error(
          "Both AI services are currently unavailable. Please try again in a few minutes.",
        );
      }
    }

    // ── 10. Parse AI response ─────────────────────────────────────────────────

    let blogData;
    try {
      blogData = parseAIResponse(rawResponse);
    } catch {
      throw new Error(
        "AI returned an invalid response format. Please try regenerating.",
      );
    }

    // ── 11. Validate output quality — retry once if too short ─────────────────

    try {
      validateBlogOutput(blogData);
    } catch (validationErr) {
      console.warn(
        "Blog too short or incomplete, retrying with length enforcement...",
      );

      const retryPrompt =
        prompt +
        "\n\nCRITICAL: Your previous response was too short or missing required fields." +
        " You MUST write at least 600 words total and include ALL required JSON fields." +
        " Expand every section significantly.";

      try {
        const retryRaw =
          usedModel === "groq"
            ? await generateWithGroq(retryPrompt)
            : await generateWithGemini(retryPrompt);
        blogData = parseAIResponse(retryRaw);
        // Don't throw if retry is also short — use it anyway, better than nothing
      } catch (retryErr) {
        console.warn(
          "Retry also failed, using original response:",
          retryErr.message,
        );
      }
    }

    // ── Finalize — update pending draft with real content ─────────────────────

    if (pendingBlog) {
      pendingBlog.title = blogData.title;
      pendingBlog.content = JSON.stringify(blogData);
      pendingBlog.excerpt = blogData.excerpt || "";
      pendingBlog.isUnfinished = false; // mark complete
      await pendingBlog.save();
    }

    // ── Update daily generation count (only for fresh generations) ────────────

    if (!isRegeneration) {
      user.dailyGenerations += 1;
    }

    // ── Release the lock ──────────────────────────────────────────────────────

    user.isGenerating = false;
    user.pendingDraftId = null;
    await user.save();

    // ── Return response ───────────────────────────────────────────────────────

    res.json({
      blog: blogData,
      model: usedModel,
      draftId: pendingBlog?._id || null,
      readmeNote:
        readmeWarning === "NO_README"
          ? "No README was found. Blog was generated from basic repo information only."
          : null,
    });
  } catch (err) {
    // ── 12. Always reset the lock on any error ────────────────────────────────
    if (generationStarted) {
      await cleanupAfterGeneration(user);
    }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Check for unfinished draft from previous session
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called by frontend when the Create Blog page loads.
 * Edge case: tab was closed mid-generation — show "You have an unfinished blog."
 */
exports.checkPendingDraft = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.pendingDraftId) {
      return res.json({ hasPendingDraft: false });
    }

    const draft = await Blog.findById(user.pendingDraftId);

    if (!draft || !draft.isUnfinished) {
      // Edge case: draft was already completed or manually deleted — clean up reference
      user.pendingDraftId = null;
      await user.save();
      return res.json({ hasPendingDraft: false });
    }

    // Also reset any stale isGenerating flag from a crashed request
    if (user.isGenerating) {
      user.isGenerating = false;
      await user.save();
    }

    res.json({
      hasPendingDraft: true,
      draft: {
        id: draft._id,
        repoName: draft.repoName,
        tone: draft.tone,
        createdAt: draft.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Discard pending draft
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User chose to discard the unfinished draft and start fresh.
 */
exports.discardPendingDraft = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.pendingDraftId) {
      await Blog.findByIdAndDelete(user.pendingDraftId);
      user.pendingDraftId = null;
      await user.save();
    }

    res.json({ message: "Pending draft discarded." });
  } catch (err) {
    next(err);
  }
};
