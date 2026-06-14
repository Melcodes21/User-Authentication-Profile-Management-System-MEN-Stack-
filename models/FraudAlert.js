const mongoose = require("mongoose");

const fraudAlertSchema = new mongoose.Schema(
  {
    sender:     { type: String, required: true },
    receiver:   { type: String, required: true },
    amount:     { type: Number, required: true },
    riskScore:  { type: Number, required: true },
    reasons:    [String],
    action:     { type: String, enum: ["flagged", "blocked", "otp_required"], required: true },
    reviewStatus: {
      type: String,
      enum: ["pending", "confirmed_fraud", "false_positive"],
      default: "pending",
    },
    reviewNotes: { type: String, trim: true },
    reviewedBy:  { type: String, trim: true },
    reviewedAt:  { type: Date },
    deviceId:   { type: String },
    location:   { type: String },
  },
  { timestamps: true }
);

fraudAlertSchema.index({ sender: 1, createdAt: -1 });
fraudAlertSchema.index({ riskScore: -1 });
fraudAlertSchema.index({ reviewStatus: 1 });

module.exports = mongoose.model("FraudAlert", fraudAlertSchema);
