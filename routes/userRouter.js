const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  adminLogin,
  getUsers,
  broadcastSms,
  getMessages,
  getUnreadMessages,
  markMessagesRead,
  promoteToAdmin,
  demoteToUser,
  getBalance,
  depositBalance,
  adminTopUp,
  changePin,
  checkUser,
} = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/auth");

// Public
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/admin-login", adminLogin);
router.get("/check/:phoneNumber", protect, checkUser);

// User (any logged in)
router.get("/messages", protect, getMessages);
router.get("/messages/unread", protect, getUnreadMessages);
router.post("/messages/read", protect, markMessagesRead);
router.get("/balance", protect, getBalance);
router.post("/deposit", protect, depositBalance);
router.post("/change-pin", protect, changePin);

// Admin only
router.get("/all", protect, adminOnly, getUsers);
router.post("/broadcast", protect, adminOnly, broadcastSms);
router.post("/promote", protect, adminOnly, promoteToAdmin);
router.post("/demote", protect, adminOnly, demoteToUser);
router.post("/topup", protect, adminOnly, adminTopUp);

module.exports = router;
