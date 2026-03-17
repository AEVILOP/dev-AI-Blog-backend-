const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  githubId: { type: String , required: true , unique:true },
  username: { type: String , required: true },
  email: { type: String , default: null },
  avatarURL: { type: String , default: null },
  githubUsername: { type: String , default: null },
  githubAccesstoken: { type: String , default: true },

  // daily generation tracking
  dailyGenerations: {},

  //reset when last generation is different calender day
  lastGenerationDate: {},

  // edge case 1: two tabs open at the same time  so block the second request
  isGenerating: {},

  //edge case 2: tab closed or refreshed in mid-generation so save the reference to the unfinished draft
//   on the next visit shows on home page pending draft is true 
  pendingDraftId: {},
}, { timestamps:true})

module.exports = mongoose.model('User', userSchema)
