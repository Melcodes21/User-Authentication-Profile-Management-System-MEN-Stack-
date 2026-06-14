const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  phoneNumber: {
    type: String,
    unique: true,
    required: true,
  },

  pin: {
    type: String,
    required: true,
  },

  failedPinAttempts: {
    type: Number,
    default: 0,
  },

  lockedUntil: {
    type: Date,
    default: null,
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
});
module.exports = mongoose.model("momoUser", userSchema);
