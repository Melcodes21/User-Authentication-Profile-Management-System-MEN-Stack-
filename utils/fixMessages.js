/**
 * Run: node fixMessages.js
 * Fixes existing welcome messages that were saved without a recipient
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Message  = require("./models/Message");
const User     = require("./models/User");

mongoose.connect(process.env.DB_URI).then(async () => {
  console.log("✅ Connected to MongoDB");

  const users = await User.find().select("name phoneNumber");

  let fixed = 0;
  for (const user of users) {
    // Find welcome messages that mention this user's name and have no recipient
    const result = await Message.updateMany(
      {
        recipient: null,
        sentBy: "system",
        message: { $regex: user.name, $options: "i" },
      },
      {
        $set: { recipient: user.phoneNumber, type: "personal" },
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Fixed ${result.modifiedCount} message(s) for ${user.name} (${user.phoneNumber})`);
      fixed += result.modifiedCount;
    }
  }

  if (fixed === 0) {
    console.log("ℹ️  No messages needed fixing");
  } else {
    console.log(`\n🎉 Fixed ${fixed} message(s) total`);
  }

  await mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
