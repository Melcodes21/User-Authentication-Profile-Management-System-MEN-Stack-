const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    message:   { type: String, required: true },
    sentBy:    { type: String, default: "admin" },
    type:      { type: String, enum: ["broadcast", "personal"], default: "broadcast" },
    recipient: { type: String, default: null }, // null = everyone, phone = specific user
    readBy:    [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
