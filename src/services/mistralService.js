// src/services/mistralService.js
// Used as fallback when Groq fails or is unavailable

const axios = require("axios");

/**
 * Generate blog content using Mistral API
 * Returns the raw string response from the model
 */
const generateWithMistral = async (prompt) => {
  const response = await axios.post(
    "https://api.mistral.ai/v1/chat/completions",
    {
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000, // 60 second timeout
    },
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Mistral returned empty content");
  }

  return content;
};

module.exports = generateWithMistral;
