const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
      trim: true,
      ref: "User",
    },
    receiver: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["send", "withdraw", "deposit"],
      required: true,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: "RWF",
    },

    location: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
    },

    status: {
      type: String,
      enum: ["normal", "flagged", "blocked", "completed"],
      default: "normal",
    },
    reasons: [String],
    riskScore: {
      type: Number,
      default: 0,
    },
    reviewStatus: {
      type: String,
      enum: ["pending", "confirmed_fraud", "false_positive"],
      default: "pending",
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
  },

  {
    timestamps: true, //  automatically adds createdAt & updatedAt
  },
);
transactionSchema.index({ sender: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ reviewStatus: 1 });
module.exports = mongoose.model("momoTransaction", transactionSchema);
