// src/services/geminiService.js
// Fallback AI — Gemini 1.5 Flash free tier (1500 req/day, 15 req/min)

const { GoogleGenerativeAI } = require("@google/generative-ai");

let geminiClient = null;

const getClient = () => {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
};

/**
 * Generate blog content using Gemini 1.5 Flash.
 *
 * Model: gemini-1.5-flash
 *   → Fast, free, 1500 requests/day
 *   → 1M token context window — handles long READMEs easily
 *   → Good writing quality for technical content
 *
 * Safety settings set to OFF for all categories:
 *   → Gemini by default blocks content it considers "dangerous"
 *   → Technical blog content about security, auth, rate limiting
 *     can trigger false positives and block valid responses
 *   → We disable all safety filters since our content is legitimate
 *
 * generationConfig:
 *   → responseMimeType: "text/plain" — we handle JSON parsing ourselves
 *   → temperature 0.75 — matches Groq for consistent output style
 *   → maxOutputTokens 4096 — same cap as Groq
 *
 * Returns raw string response from the model.
 */
const generateWithGemini = async (prompt) => {
  const client = getClient();

  const model = client.getGenerativeModel({
    model: "gemini-1.5-flash",

    // Disable all safety filters
    // Technical content about auth, security, APIs triggers false blocks
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE",
      },
    ],

    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 4096,
      responseMimeType: "text/plain",
    },
  });

  const result = await model.generateContent(prompt);

  // Gemini response structure is different from OpenAI-style APIs
  const content = result.response?.text();

  if (!content || content.trim().length === 0) {
    throw new Error("Gemini returned empty content");
  }

  // Edge case: Gemini sometimes appends disclaimers or notes at the end
  // even when told not to. Strip anything after the last closing brace
  // since our response must be pure JSON.
  const lastBrace = content.lastIndexOf("}");
  if (lastBrace !== -1) {
    return content.substring(0, lastBrace + 1);
  }

  return content;
};

module.exports = generateWithGemini;
