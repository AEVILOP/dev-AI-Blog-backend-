// src/services/groqService.js
// Primary AI — Groq free tier (14,400 req/day)

const Groq = require("groq-sdk");

let groqClient = null;

const getClient = () => {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

/**
 * Generate blog content using Groq.
 *
 * Model: llama-3.3-70b-versatile
 *   → Latest Llama 3.3, noticeably better writing than llama3-70b-8192
 *   → More natural, less robotic output
 *   → Same free tier, same speed
 *
 * Temperature 0.75:
 *   → Slightly higher than before for more natural varied writing
 *   → Not so high that JSON structure breaks
 *
 * Returns raw string response from the model.
 */
const generateWithGroq = async (prompt) => {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.75,
    max_tokens: 4096,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned empty content");
  }

  return content;
};

module.exports = generateWithGroq;
