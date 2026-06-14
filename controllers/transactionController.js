const Transaction = require("../models/transaction");
const { calculateRisk, logFraudAlert } = require("../services/fraudService");
const FraudAlert = require("../models/FraudAlert");
const Complaint = require("../models/Complaint");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Message = require("../models/Message");
const { generateOTP, verifyOTP } = require("../services/otpService");
const { transactionValidation } = require("../utils/validation");
const {
  sendOtpSms,
  sendTransactionSuccessSms,
  sendTransactionBlockedSms,
  sendFailedPinSms,
  sendAccountLockedSms,
} = require("../services/smsService");

const shouldBlockTransaction = (riskScore, reasons = []) => {
  if (riskScore < 80) return false;

  return reasons.some((reason) => reason.includes("Blacklisted number involved"));
};

const sendAccountLockMessage = async (user, lockedUntil) => {
  try {
    await Message.create({
      message: `MTN MoMo SECURITY NOTICE: Your account has been temporarily blocked after 2 invalid PIN attempts. It will be available again at ${lockedUntil.toLocaleString()}. If this was not you, call 100 immediately.`,
      sentBy: "system",
      type: "personal",
      recipient: user.phoneNumber,
    });
  } catch (error) {
    console.error("Failed to create account lock message:", error.message);
  }
};

// ===================== CREATE TRANSACTION =====================
const createTransaction = async (req, res) => {
  try {
    // 1. Validate input
    const { error, value } = transactionValidation(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const transactionData = value;
    const { pin: _pin, ...txData } = transactionData; // strip pin before saving

    // 2. Normalize phone numbers
    const senderPhone = txData.sender.trim();
    const receiverPhone = txData.receiver.trim();

    if (req.user.phoneNumber !== senderPhone) {
      return res.status(403).json({
        message: "You can only send money from your own account",
      });
    }

    // 3. Prevent self-transfer
    if (senderPhone === receiverPhone) {
      return res.status(400).json({
        message: "Sender cannot send money to themselves",
      });
    }

    // 4. Check sender exists
    const sender = await User.findOne({ phoneNumber: senderPhone });
    if (!sender) {
      return res.status(404).json({
        message: "Sender not registered",
      });
    }

    // 5. Check receiver exists
    const receiver = await User.findOne({ phoneNumber: receiverPhone });
    if (!receiver) {
      return res.status(404).json({
        message: "Receiver not registered",
      });
    }

    // 5b. Check sender has sufficient balance
    if (sender.balance < txData.amount) {
      return res.status(400).json({
        message: `Insufficient balance. Your balance is RWF ${sender.balance.toLocaleString()}`,
      });
    }

    // 6. Verify PIN with lockout
    if (sender.lockedUntil && sender.lockedUntil > Date.now()) {
      const blocked = new Transaction({
        ...txData,
        riskScore: 100,
        reasons: ["Account locked due to too many failed PIN attempts"],
        status: "blocked",
      });
      await blocked.save();
      sendAccountLockedSms(senderPhone);

      return res.status(423).json({
        message: "Account temporarily locked due to too many failed PIN attempts. Try again later.",
      });
    }

    const isValidPin = await bcrypt.compare(req.body.pin, sender.pin);
    if (!isValidPin) {
      sender.failedPinAttempts += 1;

      const reasons = [`Failed PIN attempt ${sender.failedPinAttempts} of 2`];
      const willLock = sender.failedPinAttempts >= 2;
      if (willLock) {
        sender.lockedUntil = new Date(Date.now() + 1 * 60 * 1000);
        sender.failedPinAttempts = 0;
        reasons[0] = "Account locked after 2 failed PIN attempts";
        await sendAccountLockMessage(sender, sender.lockedUntil);
      }
      await sender.save();

      const flagged = new Transaction({
        ...txData,
        riskScore: willLock ? 100 : 60,
        reasons,
        status: willLock ? "blocked" : "flagged",
      });
      await flagged.save();

      if (willLock) {
        sendAccountLockedSms(senderPhone);
      } else {
        sendFailedPinSms(senderPhone, 2 - sender.failedPinAttempts);
      }

      return res.status(401).json({ message: willLock
        ? "Too many failed attempts. Account locked for 1 minutes."
        : "Invalid PIN"
      });
    }

    // Reset on success
    if (sender.failedPinAttempts > 0) {
      sender.failedPinAttempts = 0;
      sender.lockedUntil = null;
      await sender.save();
    }

    // 7. Fraud detection
    const { riskScore, reasons } = await calculateRisk(txData);

    // 8. Block only hard-fraud transactions. Soft risk, such as a larger
    // than usual payment, should trigger OTP instead of blocking.
    if (shouldBlockTransaction(riskScore, reasons)) {
      const blocked = new Transaction({
        ...txData,
        riskScore,
        reasons,
        status: "blocked",
      });
      await blocked.save();
      sendTransactionBlockedSms(senderPhone, reasons[0]);
      await logFraudAlert(txData, riskScore, reasons, "blocked");

      return res.status(403).json({
        message: "Transaction blocked due to high risk",
        riskScore,
        reasons,
      });
    }

    // 9. OTP only for: first ever transaction OR first transaction >= 50k
    const completedTxFilter = { sender: senderPhone, status: "completed" };
    const [
      txCount,
      firstLargeTxCount,
    ] = await Promise.all([
      Transaction.countDocuments(completedTxFilter),
      Transaction.countDocuments({ ...completedTxFilter, amount: { $gte: 50000 } }),
    ]);

    const isFirstTransaction      = txCount === 0;
    const isFirstLargeTransaction = txData.amount >= 50000 && firstLargeTxCount === 0;
    const needsOtp = isFirstTransaction || isFirstLargeTransaction;

    if (needsOtp) {
      const otp = generateOTP(senderPhone, { ...txData, riskScore, reasons });
      sendOtpSms(senderPhone, otp);

      await Message.create({
        message: `🔐 Your MTN MoMo OTP is: ${otp}. Valid for 5 minutes. Do NOT share this code with anyone. MTN will never ask for your OTP.`,
        sentBy: "system",
        type: "personal",
        recipient: senderPhone,
      });

      const otpReason = isFirstTransaction
        ? "First transaction requires OTP verification"
        : "First transaction of RWF 50,000 or above requires OTP verification";

      return res.status(200).json({
        message: otpReason,
        otpRequired: true,
        otpSent: true,
        riskScore,
      });
    }

    // 10. Update balances. The sender update includes the balance check so
    // concurrent transactions cannot overdraw the account.
    const updatedSender = await User.findOneAndUpdate(
      { phoneNumber: senderPhone, balance: { $gte: txData.amount } },
      { $inc: { balance: -txData.amount } },
      { new: true },
    ).select("name balance");

    if (!updatedSender) {
      return res.status(400).json({
        message: "Insufficient balance. Please refresh and try again.",
      });
    }

    const updatedReceiver = await User.findOneAndUpdate(
      { phoneNumber: receiverPhone },
      { $inc: { balance: txData.amount } },
      { new: true },
    ).select("name phoneNumber balance");

    const transaction = new Transaction({
      ...txData,
      riskScore,
      status: "completed",
      reasons,
    });

    await transaction.save();
    sendTransactionSuccessSms(senderPhone, txData.amount, receiverPhone);

    await Message.create({
      message: `💸 You sent RWF ${Number(txData.amount).toLocaleString()} to ${updatedReceiver.name} (${receiverPhone}). Your balance is RWF ${Number(updatedSender.balance).toLocaleString()}. If you did not authorize this, call 100 immediately.`,
      sentBy: "system",
      type: "personal",
      recipient: senderPhone,
    });

    await Message.create({
      message: `💰 You received RWF ${Number(txData.amount).toLocaleString()} from ${sender.name} (${senderPhone}). Your new balance is RWF ${Number(updatedReceiver.balance).toLocaleString()}.`,
      sentBy: "system",
      type: "personal",
      recipient: receiverPhone,
    });

    return res.status(201).json({
      message: "Transaction processed successfully",
      receiverName: updatedReceiver.name,
      balance: updatedSender.balance,
      transaction,
    });
  } catch (error) {
    console.error("Error creating transaction:", error.message);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// ===================== VERIFY OTP =====================
const confirmOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    const result = verifyOTP(phoneNumber, otp);

    if (!result.valid) {
      // save flagged transaction if we have the transaction data
      if (result.transactionData) {
        const { riskScore, reasons, ...txData } = result.transactionData;
        await new Transaction({
          ...txData,
          riskScore: riskScore || 60,
          reasons: [result.reason || "Invalid OTP attempt"],
          status: "flagged",
        }).save();
      }
      return res.status(400).json({ message: result.reason });
    }

    const transactionData = result.transactionData;

    if (!transactionData) {
      return res.status(400).json({ message: "Transaction data not found, please retry" });
    }

    // Save transaction after OTP success
    const { riskScore, reasons, fraudAlertId, ...txData } = transactionData;
    const transaction = new Transaction({
      ...txData,
      riskScore: riskScore || 0,
      reasons: reasons || [],
      status: "completed",
      reviewStatus: "false_positive",
      reviewNotes: "OTP verification passed; transaction completed by the account holder.",
      reviewedBy: "system",
      reviewedAt: new Date(),
    });

    await transaction.save();

    const fraudAlertReview = {
        reviewStatus: "false_positive",
        reviewNotes: "OTP verification passed; transaction completed by the account holder.",
        reviewedBy: "system",
        reviewedAt: new Date(),
    };

    if (fraudAlertId) {
      await FraudAlert.findByIdAndUpdate(fraudAlertId, fraudAlertReview);
    } else {
      await FraudAlert.findOneAndUpdate(
        {
          sender: txData.sender,
          receiver: txData.receiver,
          amount: txData.amount,
          action: "otp_required",
          reviewStatus: { $ne: "confirmed_fraud" },
        },
        fraudAlertReview,
        { sort: { createdAt: -1 } },
      );
    }

    // Update balances
    await User.findOneAndUpdate({ phoneNumber: txData.sender },   { $inc: { balance: -txData.amount } });
    await User.findOneAndUpdate({ phoneNumber: txData.receiver }, { $inc: { balance:  txData.amount } });

    return res.status(201).json({
      message: "Transaction completed successfully",
      transaction,
    });
  } catch (error) {
    console.error("OTP verification error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ===================== REPORT =====================
const getReport = async (req, res) => {
  try {
    const [totalTransactions, totalFlagged, totalBlocked, totalCompleted,
           totalFalsePositives, flaggedTransactions, blockedTransactions] = await Promise.all([
      Transaction.countDocuments(),
      Transaction.countDocuments({ status: "flagged" }),
      Transaction.countDocuments({ status: "blocked" }),
      Transaction.countDocuments({ status: "completed" }),
      Transaction.countDocuments({ reviewStatus: "false_positive" }),
      Transaction.find({ status: "flagged" }).sort({ createdAt: -1 }),
      Transaction.find({ status: "blocked" }).sort({ createdAt: -1 }),
    ]);

    return res.json({
      totalTransactions,
      totalFlagged,
      totalBlocked,
      totalCompleted,
      totalFalsePositives,
      flaggedTransactions,
      blockedTransactions,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ===================== TRANSACTION HISTORY =====================
const getHistory = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const transactions = await Transaction.find({
      $or: [{ sender: phoneNumber }, { receiver: phoneNumber }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({ total: transactions.length, transactions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ===================== ALL TRANSACTIONS (ADMIN) =====================
const getAllTransactions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== "all" ? { status } : {};
    const transactions = await Transaction.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ total: transactions.length, transactions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ===================== FRAUD ALERTS LOG =====================
const getFraudAlerts = async (req, res) => {
  try {
    const alerts = await FraudAlert.find().sort({ createdAt: -1 }).limit(100);
    const total  = await FraudAlert.countDocuments();
    const falsePositiveTotal = await FraudAlert.countDocuments({ reviewStatus: "false_positive" });
    return res.status(200).json({ total, falsePositiveTotal, alerts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ===================== USER TRANSACTION COMPLAINT =====================
const reportTransactionComplaint = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Complaint reason is required" });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const reporter = req.user.phoneNumber;
    const isParticipant = transaction.sender === reporter || transaction.receiver === reporter;
    if (!isParticipant) {
      return res.status(403).json({ message: "You can only report your own transactions" });
    }

    const reportedAgainst = transaction.sender === reporter
      ? transaction.receiver
      : transaction.sender;

    const complaint = await Complaint.create({
      transaction: transaction._id,
      reporter,
      reportedAgainst,
      reason: reason.trim(),
    });

    transaction.reviewStatus = "pending";
    transaction.reviewNotes = `User complaint from ${reporter}: ${reason.trim()}`;
    transaction.reviewedBy = "user_report";
    transaction.reviewedAt = new Date();
    if (!Array.isArray(transaction.reasons)) {
      transaction.reasons = [];
    }
    if (!transaction.reasons.includes("User complaint submitted")) {
      transaction.reasons.push("User complaint submitted");
    }
    await transaction.save();

    return res.status(201).json({
      message: "Complaint submitted for admin review",
      complaint,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already reported this transaction" });
    }
    return res.status(500).json({ error: error.message });
  }
};

// ===================== ADMIN COMPLAINTS =====================
const getTransactionComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("transaction")
      .sort({ createdAt: -1 })
      .limit(100);
    const total = await Complaint.countDocuments();
    return res.status(200).json({ total, complaints });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ===================== REVIEW FRAUD DECISION =====================
const reviewFraudDecision = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const { reviewStatus, reviewNotes = "" } = req.body;
    const allowedStatuses = ["pending", "confirmed_fraud", "false_positive"];

    if (!allowedStatuses.includes(reviewStatus)) {
      return res.status(400).json({ message: "Invalid review status" });
    }

    const reviewData = {
      reviewStatus,
      reviewNotes: reviewNotes.trim(),
      reviewedBy: req.user.phoneNumber,
      reviewedAt: new Date(),
    };

    const model = targetType === "alert" ? FraudAlert : targetType === "transaction" ? Transaction : null;
    if (!model) {
      return res.status(400).json({ message: "Review target must be alert or transaction" });
    }

    const item = await model.findByIdAndUpdate(targetId, reviewData, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ message: "Review target not found" });
    }

    return res.status(200).json({
      message: reviewStatus === "false_positive"
        ? "Marked as false positive"
        : "Review status updated",
      item,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ===================== EXPORT =====================
module.exports = {
  createTransaction,
  confirmOtp,
  getReport,
  getHistory,
  getAllTransactions,
  getFraudAlerts,
  reviewFraudDecision,
  reportTransactionComplaint,
  getTransactionComplaints,
};
