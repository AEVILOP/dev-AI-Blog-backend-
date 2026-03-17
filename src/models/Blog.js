const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: string, required: true },
    content: { type: string, required: true },
    excerpt: { type: string, required: true },
    repoName: { type: string, default: "" },
    repoURL: { type: string, default: "" },
    repoLanguage: { type: string, default: "" },
    coverImage: { type: string, default: "" },
    category: { type: string, default: "" },
    tone: { type: string, enum: ["casual", "professional"], default: "casual" },
    isPublished: { type: Boolean, default: false },
    regenerationCount: { type: number, default: 0 },

    // handling the  edge case of user refreshes the page in mid-generation or close the tab mid-generation
    // in this case we save the unfinished draft and show it on the home page with pending draft is true
    // and on the next visit we show the pending draft on the home page with pending draft is true
    isFinished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// compound index to check the duplicate blog generation
blogSchema.index({ author: 1, title: 1 });

module.exports = mongoose.model("Blog", blogSchema);
