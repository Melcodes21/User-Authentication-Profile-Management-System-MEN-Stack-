const Transaction = require("../models/transaction");
const User        = require("../models/User");
const Message     = require("../models/Message");
const FraudAlert  = require("../models/FraudAlert");
const { verifyOTP } = require("../services/otpService");

const confirmOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    const result = verifyOTP(phoneNumber, otp);

    if (!result.valid) {
      if (result.transactionData) {
        const { riskScore, reasons, ...txData } = result.transactionData;
        await new Transaction({
          ...txData,
          riskScore: riskScore || 60,
          reasons: [result.reason || "Invalid OTP attempt"],
          status: "flagged",
        }).save();
      }
      return res.status(400).json({ message: result.reason || "Invalid or expired OTP" });
    }

    const transactionData = result.transactionData;
    if (!transactionData) {
      return res.status(400).json({ message: "Transaction data not found, please retry" });
    }

    const { riskScore, reasons, fraudAlertId, ...txData } = transactionData;

    // Update balances before saving the completed transaction. The sender
    // update includes a balance check to avoid incorrect deductions.
    const sender = await User.findOneAndUpdate(
      { phoneNumber: txData.sender, balance: { $gte: txData.amount } },
      { $inc: { balance: -txData.amount } },
      { new: true },
    ).select("balance");

    if (!sender) {
      return res.status(400).json({
        message: "Insufficient balance. Please refresh and try again.",
      });
    }

    const receiver = await User.findOneAndUpdate(
      { phoneNumber: txData.receiver },
      { $inc: { balance: txData.amount } },
      { new: true },
    ).select("name phoneNumber balance");

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

    await Message.create({
      message: `💸 You sent RWF ${Number(txData.amount).toLocaleString()} to ${receiver?.name || "Recipient"} (${txData.receiver}). Your balance is RWF ${Number(sender?.balance || 0).toLocaleString()}. If you did not authorize this, call 100 immediately.`,
      sentBy: "system",
      type: "personal",
      recipient: txData.sender,
    });

    const senderUser = await User.findOne({ phoneNumber: txData.sender }).select("name phoneNumber");

    await Message.create({
      message: `💰 You received RWF ${Number(txData.amount).toLocaleString()} from ${senderUser?.name || "Sender"} (${txData.sender}). Your new balance is RWF ${Number(receiver?.balance || 0).toLocaleString()}.`,
      sentBy: "system",
      type: "personal",
      recipient: txData.receiver,
    });

    res.status(201).json({
      message: "Transaction verified and completed successfully",
      receiverName: receiver?.name,
      balance: sender?.balance,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { confirmOTP };
