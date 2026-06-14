/**
 * TRANSACTION SEED SCRIPT
 * Run with: node seed.js
 * Generates realistic transaction data for all registered users
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("./models/transaction");
const User = require("./models/User");

const locations = ["Kigali", "Butare", "Gisenyi", "Musanze", "Rwamagana", "Nyagatare"];
const devices   = ["web-simulator", "android-001", "android-002", "ios-001"];
const types     = ["send", "withdraw", "deposit"];

// Random number between min and max
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Generate a date within the last N days at a realistic hour
const recentDate = (daysAgo, hourMin = 7, hourMax = 21) => {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysAgo));
  d.setHours(rand(hourMin, hourMax), rand(0, 59), rand(0, 59));
  return d;
};

const seed = async () => {
  await mongoose.connect(process.env.DB_URI);
  console.log("✅ Connected to MongoDB");

  const users = await User.find().select("phoneNumber name");
  if (users.length < 2) {
    console.log("❌ Need at least 2 registered users. Register some users first.");
    process.exit(1);
  }

  console.log(`👥 Found ${users.length} users — generating transactions...\n`);

  const phones = users.map(u => u.phoneNumber);
  const transactions = [];

  // ===== NORMAL TRANSACTIONS (bulk — past 30 days) =====
  for (const user of users) {
    const txCount = rand(15, 30); // each user gets 15-30 normal transactions
    for (let i = 0; i < txCount; i++) {
      const receiver = pick(phones.filter(p => p !== user.phoneNumber));
      const amount   = rand(500, 50000);
      transactions.push({
        sender:    user.phoneNumber,
        receiver,
        amount,
        type:      "send",
        currency:  "RWF",
        location:  pick(["Kigali", "Butare"]), // mostly familiar locations
        deviceId:  "web-simulator",             // mostly familiar device
        status:    "completed",
        riskScore: rand(0, 20),
        reasons:   [],
        createdAt: recentDate(30),
      });
    }
  }

  // ===== FLAGGED TRANSACTIONS =====
  for (let i = 0; i < 10; i++) {
    const sender   = pick(phones);
    const receiver = pick(phones.filter(p => p !== sender));
    transactions.push({
      sender,
      receiver,
      amount:    rand(100000, 400000),
      type:      "send",
      currency:  "RWF",
      location:  pick(locations),
      deviceId:  pick(devices),
      status:    "flagged",
      riskScore: rand(50, 79),
      reasons:   pick([
        ["Amount significantly higher than usual"],
        ["Sending to an unknown receiver"],
        ["New device detected"],
        ["Unusual transaction type: withdraw (never used before)"],
        ["Failed PIN attempt 3 of 5"],
      ]),
      createdAt: recentDate(14),
    });
  }

  // ===== BLOCKED TRANSACTIONS =====
  for (let i = 0; i < 8; i++) {
    const sender   = pick(phones);
    const receiver = pick(phones.filter(p => p !== sender));
    transactions.push({
      sender,
      receiver,
      amount:    rand(500001, 2000000),
      type:      "send",
      currency:  "RWF",
      location:  pick(locations),
      deviceId:  pick(devices),
      status:    "blocked",
      riskScore: rand(80, 100),
      reasons:   pick([
        ["Large transaction amount", "New device detected"],
        ["Large transaction amount", "Unusual location detected"],
        ["Account locked after 5 failed PIN attempts"],
        ["Too many transactions in short time", "Large transaction amount"],
        ["Amount significantly higher than usual", "Sending to an unknown receiver"],
      ]),
      createdAt: recentDate(7),
    });
  }

  // ===== SUSPICIOUS PATTERN — rapid fire transactions =====
  const suspiciousUser = phones[0];
  const rapidReceiver  = phones[1];
  const rapidBase      = new Date();
  rapidBase.setDate(rapidBase.getDate() - 1);
  rapidBase.setHours(2, 0, 0); // 2am — unusual hour

  for (let i = 0; i < 7; i++) {
    const d = new Date(rapidBase.getTime() + i * 60000); // 1 min apart
    transactions.push({
      sender:    suspiciousUser,
      receiver:  rapidReceiver,
      amount:    rand(10000, 30000),
      type:      "send",
      currency:  "RWF",
      location:  "Gisenyi",
      deviceId:  "android-999",
      status:    i < 5 ? "flagged" : "blocked",
      riskScore: 50 + i * 8,
      reasons:   ["Too many transactions in short time", "Unusual transaction time"],
      createdAt: d,
    });
  }

  await Transaction.insertMany(transactions);
  console.log(`✅ Inserted ${transactions.length} transactions:`);
  console.log(`   - ${transactions.filter(t => t.status === "completed").length} completed`);
  console.log(`   - ${transactions.filter(t => t.status === "flagged").length} flagged`);
  console.log(`   - ${transactions.filter(t => t.status === "blocked").length} blocked`);
  console.log("\n🎉 Done! Refresh your admin dashboard to see the data.");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
