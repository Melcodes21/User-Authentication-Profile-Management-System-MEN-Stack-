const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 255,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 6,
    maxlength: 255,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 1024,
  },

  age: {
    type: Number,
    min: 1,
    max: 255,
  },

  bio: {
    type: String,
    maxlength: 1024,
  },
});

module.exports = mongoose.model("UserProfile", userSchema);
