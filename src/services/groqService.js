// src/services/groqService.js

const Groq = require("groq-sdk");

let groqClient = null;

const getClient = () => {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

/**
 * Generate blog content using Groq (Llama3)
 * Returns the raw string response from the model
 */
const generateWithGroq = async (prompt) => {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned empty content");
  }

  return content;
};

module.exports = generateWithGroq;
