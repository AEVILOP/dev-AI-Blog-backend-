const mongoose = require("mongoose");
const commitCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // "owner/repo"
    commits: { type: Array, default: [] }, // raw commit list
    cachedAt: { type: Date, required: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    githubId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    email: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    githubUsername: { type: String, default: null },
    githubAccessToken: { type: String, default: null },
    accessLevel: { type: String, enum: ['public', 'full'], default: 'public' },

    // daily generation tracking
    dailyGenerations: { type: Number, default: 0 },

    //reset when last generation is different calender day
    lastGenerationDate: { type: Date, default: null },

    // edge case 1: two tabs open at the same time  so block the second request
    isGenerating: { type: Boolean, default: false },

    //edge case 2: tab closed or refreshed in mid-generation so save the reference to the unfinished draft
    //   on the next visit shows on home page pending draft is true
    pendingDraftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      default: null,
    },
    commitCache: { type: [commitCacheSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
