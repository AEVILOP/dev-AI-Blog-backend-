// src/services/readmeService.js

// ── Template phrases ────────────────────────────────────────────────────────
const TEMPLATE_PHRASES = [
  "getting started with create react app",
  "this project was bootstrapped with",
  "available scripts",
  "learn more about create react app",
  "getting started with vite",
];

// ── Injection patterns ─────────────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(all|previous|above)\s+instructions/gi,
  /disregard\s+(all|previous|above)\s+instructions/gi,
  /you are now/gi,
  /act as\s+/gi,
  /override\s+(instructions|system)/gi,
  /reveal\s+(prompt|instructions)/gi,
];

// ── Extract useful code blocks ─────────────────────────────────────────────
const extractUsefulCodeBlocks = (text) => {
  const blocks = text.match(/```[\s\S]*?```/g) || [];

  return blocks
    .map((block) => block.replace(/```/g, "").trim())
    .filter((block) => block.length > 0 && block.length < 300) // keep only small useful ones
    .slice(0, 3); // limit to 3 snippets
};

// ── Remove code blocks (after extraction) ──────────────────────────────────
const removeCodeBlocks = (text) => {
  return text.replace(/```[\s\S]*?```/g, "");
};

// ── Remove markdown noise ───────────────────────────────────────────────────
const cleanMarkdownNoise = (text) => {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[.*?\]\(.*?\)/g, "") // links
    .replace(/<[^>]*>/g, ""); // HTML tags
};

// ── Normalize ───────────────────────────────────────────────────────────────
const normalize = (text) => {
  return text
    .replace(/\0/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

// ── Template detection ─────────────────────────────────────────────────────
const isTemplate = (text) => {
  if (!text) return true;

  const lower = text.toLowerCase();

  let matches = 0;
  TEMPLATE_PHRASES.forEach((p) => {
    if (lower.includes(p)) matches++;
  });

  return matches >= 2 || text.length < 150;
};

// ── Injection sanitization ─────────────────────────────────────────────────
const sanitize = (text) => {
  let result = text;

  INJECTION_PATTERNS.forEach((p) => {
    result = result.replace(p, "[REMOVED]");
  });

  return result;
};

// ── Section extraction ─────────────────────────────────────────────────────
const extractSections = (text) => {
  const lines = text.split("\n");
  const sections = {};

  let current = "intro";
  let buffer = [];

  const keywords = {
    description: ["about", "overview", "description", "introduction"],
    features: ["feature", "functionality", "capability"],
    tech: ["tech", "stack", "technology", "built with"],
    setup: ["install", "setup", "usage", "run", "getting started"],
  };

  const detectSection = (line) => {
    const lower = line.toLowerCase();

    for (const [key, list] of Object.entries(keywords)) {
      if (list.some((k) => lower.includes(k))) return key;
    }

    return "other";
  };

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      if (buffer.length) {
        sections[current] =
          (sections[current] || "") + buffer.join("\n") + "\n";
        buffer = [];
      }

      current = detectSection(line);
    }

    buffer.push(line);
  }

  if (buffer.length) {
    sections[current] = (sections[current] || "") + buffer.join("\n");
  }

  return sections;
};

// ── Smart truncation ───────────────────────────────────────────────────────
const truncateAtSentence = (text, max) => {
  if (text.length <= max) return text;

  const cut = text.substring(0, max);
  const lastDot = cut.lastIndexOf(".");

  return lastDot > 0 ? cut.substring(0, lastDot + 1) : cut;
};

// ── Quality scoring ────────────────────────────────────────────────────────
const scoreReadme = (text, sections) => {
  let score = 0;

  if (text.length > 300) score += 20;
  if (text.length > 800) score += 20;

  if (sections.description) score += 15;
  if (sections.features) score += 15;
  if (sections.tech) score += 10;
  if (sections.setup) score += 10;

  return Math.min(score, 100);
};

// ── Main processor ─────────────────────────────────────────────────────────
const processReadme = (raw) => {
  if (!raw || raw.trim().length === 0) {
    return {
      content: null,
      snippets: [],
      score: 0,
      quality: "low",
      warning: "NO_README",
    };
  }

  if (isTemplate(raw)) {
    return {
      content: null,
      snippets: [],
      score: 0,
      quality: "low",
      warning: "TEMPLATE",
    };
  }

  // Step 1: extract useful code
  const snippets = extractUsefulCodeBlocks(raw);

  // Step 2: remove all code blocks from main content
  let cleaned = removeCodeBlocks(raw);

  // Step 3: clean markdown + sanitize
  cleaned = cleanMarkdownNoise(cleaned);
  cleaned = sanitize(cleaned);
  cleaned = normalize(cleaned);

  // Step 4: extract sections
  const sections = extractSections(cleaned);

  //  Step 5: build prioritized content
  const MAX = 3000;
  let result = "";

  const priority = ["intro", "description", "features", "tech", "setup"];

  for (const key of priority) {
    if (!sections[key]) continue;

    const remaining = MAX - result.length;
    if (remaining <= 0) break;

    result += truncateAtSentence(sections[key], remaining) + "\n\n";
  }

  // fallback
  if (!result.trim()) {
    result = truncateAtSentence(cleaned, MAX);
  }

  //   Step 6: scoring
  const score = scoreReadme(cleaned, sections);

  let quality = "low";
  if (score >= 60) quality = "high";
  else if (score >= 30) quality = "medium";

  return {
    content: result.trim(),
    snippets,
    score,
    quality,
    warning: null,
  };
};

module.exports = {
  processReadme,
};
