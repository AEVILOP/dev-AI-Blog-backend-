const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    repoName: { type: String, default: "" },
    repoUrl: { type: String, default: "" },
    repoLanguage: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    category: { type: String, default: "" },
    tone: { type: String, enum: ["casual", "professional"], default: "casual" },
    isPublished: { type: Boolean, default: false },
    regenerationCount: { type: Number, default: 0 },

    // handling the  edge case of user refreshes the page in mid-generation or close the tab mid-generation
    // in this case we save the unfinished draft and show it on the home page with pending draft is true
    // and on the next visit we show the pending draft on the home page with pending draft is true
    isUnfinished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// compound index to check the duplicate blog generation
blogSchema.index({ author: 1, repoName: 1 });

module.exports = mongoose.model("Blog", blogSchema);
