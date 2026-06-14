const mongoose = require("mongoose");

const blacklistSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true, trim: true },
    reason: { type: String, required: true },
    blacklistedBy: { type: String, default: "system" },
    reportedByRole: { type: String, enum: ["user", "admin", "system"], default: "system" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blacklist", blacklistSchema);
