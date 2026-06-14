const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "momoTransaction",
      required: true,
    },
    reporter: {
      type: String,
      required: true,
      trim: true,
    },
    reportedAgainst: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "reviewed", "resolved"],
      default: "open",
    },
  },
  { timestamps: true },
);

complaintSchema.index({ reporter: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ transaction: 1, reporter: 1 }, { unique: true });

module.exports = mongoose.model("Complaint", complaintSchema);
