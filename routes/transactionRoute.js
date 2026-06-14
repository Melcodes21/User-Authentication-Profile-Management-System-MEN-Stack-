const express = require("express");
const router  = express.Router();
const {
  createTransaction,
  getReport,
  getHistory,
  getAllTransactions,
  getFraudAlerts,
  reviewFraudDecision,
  reportTransactionComplaint,
  getTransactionComplaints,
} = require("../controllers/transactionController");
const { protect, adminOnly } = require("../middleware/auth");

// User (any logged in)
router.post("/",                    protect, createTransaction);
router.get("/history/:phoneNumber", protect, getHistory);
router.post("/:transactionId/complaints", protect, reportTransactionComplaint);

// Admin only
router.get("/all",           protect, adminOnly, getAllTransactions);
router.get("/report",        protect, adminOnly, getReport);
router.get("/fraud-alerts",  protect, adminOnly, getFraudAlerts);
router.get("/complaints",    protect, adminOnly, getTransactionComplaints);
router.patch("/review/:targetType/:targetId", protect, adminOnly, reviewFraudDecision);

module.exports = router;
