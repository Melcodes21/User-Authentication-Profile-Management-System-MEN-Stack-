const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const { userValidation } = require("../utils/validation");
const { sendWelcomeSms, sendBroadcastSms } = require("../services/smsService");

const sendAccountLockMessage = async (user, lockedUntil) => {
  try {
    await Message.create({
      message: `MTN MoMo SECURITY NOTICE: Your account has been temporarily blocked after 5 invalid PIN attempts. It will be available again at ${lockedUntil.toLocaleString()}. If this was not you, call 100 immediately.`,
      sentBy: "system",
      type: "personal",
      recipient: user.phoneNumber,
    });
  } catch (error) {
    console.error("Failed to create account lock message:", error.message);
  }
};

const registerUser = async (req, res) => {
  try {
    const { error, value } = userValidation(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { name, phoneNumber, pin } = value;
    const phone = phoneNumber.trim().replace(/\s/g, "");

    const existingUser = await User.findOne({ phoneNumber: phone });
    if (existingUser) return res.status(409).json({ message: "User already exists" });

    const hashedPin = await bcrypt.hash(pin, 10);

    const user = new User({ name, phoneNumber: phone, pin: hashedPin, balance: 50000 });
    await user.save();

    // Save welcome message to inbox — personal to this user only
    await Message.create({
      message: `Welcome to MTN MoMo, ${name}! 🎉 Do NOT share your PIN with anyone. MTN will NEVER call or SMS asking for your PIN or OTP. Beware of fraudsters pretending to be MTN agents. If suspicious, call 100 immediately.`,
      sentBy:    "system",
      type:      "personal",
      recipient: phone,
    });

    // Send real SMS via Africa's Talking
    sendWelcomeSms(phone, name);

    res.status(201).json({
      message: "Number registered successfully",
      user: { id: user._id, name: user.name, phoneNumber: user.phoneNumber },
    });
  } catch (error) {
    console.error("Error registering user:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { phoneNumber, pin } = req.body;
    if (!phoneNumber || !pin) return res.status(400).json({ message: "Phone number and PIN are required" });

    const phone = phoneNumber.trim().replace(/\s/g, "");
    const user = await User.findOne({ phoneNumber: phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      return res.status(423).json({ message: "Account temporarily locked. Try again later." });
    }

    const isValidPin = await bcrypt.compare(pin, user.pin);
    if (!isValidPin) {
      user.failedPinAttempts += 1;
      if (user.failedPinAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedPinAttempts = 0;
        await sendAccountLockMessage(user, user.lockedUntil);
      }
      await user.save();
      return res.status(401).json({ message: "Invalid PIN" });
    }

    // Reset on success
    user.failedPinAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, phoneNumber: user.phoneNumber, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, phoneNumber: user.phoneNumber, role: user.role, balance: user.balance },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { phoneNumber, pin } = req.body;
    if (!phoneNumber || !pin) return res.status(400).json({ message: "Phone number and PIN are required" });

    const phone = phoneNumber.trim().replace(/\s/g, "");
    const user = await User.findOne({ phoneNumber: phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Block non-admins immediately
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin accounts only." });
    }

    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      return res.status(423).json({ message: "Account temporarily locked. Try again later." });
    }

    const isValidPin = await bcrypt.compare(pin, user.pin);
    if (!isValidPin) {
      user.failedPinAttempts += 1;
      if (user.failedPinAttempts >= 1) {
        user.lockedUntil = new Date(Date.now() + 1 * 60 * 1000);
        user.failedPinAttempts = 0;
        await sendAccountLockMessage(user, user.lockedUntil);
      }
      await user.save();
      return res.status(401).json({ message: "Invalid PIN" });
    }

    user.failedPinAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, phoneNumber: user.phoneNumber, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Admin login successful",
      token,
      user: { id: user._id, name: user.name, phoneNumber: user.phoneNumber, role: user.role },
    });
  } catch (error) {
    console.error("Admin login error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-pin").sort({ _id: -1 });
    res.status(200).json({ total: users.length, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const promoteToAdmin = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ message: "Phone number is required" });

    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(409).json({ message: "User is already an admin" });

    user.role = "admin";
    await user.save();

    res.status(200).json({ message: `${user.name} has been promoted to admin` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const demoteToUser = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ message: "Phone number is required" });

    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "user") return res.status(409).json({ message: "User is already a regular user" });
    if (user.phoneNumber === req.user.phoneNumber) return res.status(400).json({ message: "You cannot demote yourself" });

    user.role = "user";
    await user.save();

    res.status(200).json({ message: `${user.name} has been demoted to user` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const broadcastSms = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    const users = await User.find().select("phoneNumber");
    if (!users.length) return res.status(404).json({ message: "No registered users found" });

    const phoneNumbers = users.map(u => u.phoneNumber);

    // Save to DB so users can see it in their inbox
    await Message.create({ message, sentBy: req.user?.phoneNumber || "admin" });

    // Send real SMS
    await sendBroadcastSms(phoneNumbers, message);

    res.status(200).json({
      message: `Broadcast sent to ${phoneNumbers.length} users`,
      total: phoneNumbers.length,
    });
  } catch (error) {
    console.error("Broadcast error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getMessages = async (req, res) => {
  try {
    const phone = req.user.phoneNumber;
    const messages = await Message.find({
      $or: [
        { recipient: null },   // broadcast — everyone sees it
        { recipient: phone },  // personal — only this user
      ],
    }).sort({ createdAt: -1 });
    res.status(200).json({ total: messages.length, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUnreadMessages = async (req, res) => {
  try {
    const phone = req.user.phoneNumber;
    const count = await Message.countDocuments({
      $or: [
        { recipient: null },
        { recipient: phone },
      ],
      readBy: { $ne: phone },
    });

    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markMessagesRead = async (req, res) => {
  try {
    const phone = req.user.phoneNumber;
    const result = await Message.updateMany(
      {
        $or: [
          { recipient: null },
          { recipient: phone },
        ],
        readBy: { $ne: phone },
      },
      { $addToSet: { readBy: phone } },
    );

    res.status(200).json({
      message: "Messages marked as read",
      modified: result.modifiedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const checkUser = async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.params.phoneNumber }).select("name phoneNumber");
    if (!user) return res.status(200).json({ exists: false });
    res.status(200).json({ exists: true, name: user.name, phoneNumber: user.phoneNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBalance = async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.user.phoneNumber }).select("balance");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const changePin = async (req, res) => {
  try {
    const { phoneNumber, oldPin, newPin } = req.body;
    if (!oldPin || !newPin) return res.status(400).json({ message: "Old and new PIN are required" });
    if (!/^[0-9]{4}$/.test(newPin)) return res.status(400).json({ message: "PIN must be 4 digits" });

    const user = await User.findOne({ phoneNumber: req.user.phoneNumber });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await bcrypt.compare(oldPin, user.pin);
    if (!isValid) return res.status(401).json({ message: "Current PIN is incorrect" });

    user.pin = await bcrypt.hash(newPin, 10);
    await user.save();

    await Message.create({
      message: "MTN MoMo SECURITY NOTICE: Your PIN was changed successfully. If you did not make this change, call 100 immediately.",
      sentBy: "system",
      type: "personal",
      recipient: user.phoneNumber,
    });

    res.status(200).json({ message: "PIN changed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const depositBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: "Enter a valid amount" });
    if (amount > 500000) return res.status(400).json({ message: "Maximum deposit is RWF 500,000 at a time" });

    const user = await User.findOneAndUpdate(
      { phoneNumber: req.user.phoneNumber },
      { $inc: { balance: amount } },
      { new: true }
    ).select("balance name");

    res.status(200).json({
      message: `RWF ${Number(amount).toLocaleString()} deposited successfully`,
      balance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const adminTopUp = async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount || amount <= 0)
      return res.status(400).json({ message: "Phone number and valid amount are required" });

    const user = await User.findOneAndUpdate(
      { phoneNumber },
      { $inc: { balance: amount } },
      { new: true }
    ).select("name phoneNumber balance");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: `✅ Topped up ${user.name} with RWF ${Number(amount).toLocaleString()}`,
      balance: user.balance,
      user: { name: user.name, phoneNumber: user.phoneNumber, balance: user.balance },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registerUser, loginUser, adminLogin, getUsers, broadcastSms, getMessages, getUnreadMessages, markMessagesRead, promoteToAdmin, demoteToUser, getBalance, depositBalance, adminTopUp, changePin, checkUser };
