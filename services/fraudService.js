const Transaction = require("../models/transaction");
const Blacklist   = require("../models/Blacklist");
const FraudAlert  = require("../models/FraudAlert");

const calculateRisk = async (transaction) => {
  let riskScore = 0;
  let reasons   = [];

  // ===== RULE 0: Blacklisted number =====
  const isBlacklisted = await Blacklist.findOne({
    phoneNumber: { $in: [transaction.sender, transaction.receiver] },
  });
  if (isBlacklisted) {
    return { riskScore: 100, reasons: [`Blacklisted number involved: ${isBlacklisted.phoneNumber}`] };
  }

  // ===== RULE 1: Large amount =====
  if (transaction.amount > 500000) {
    riskScore += 40;
    reasons.push("Large transaction amount");
  }

  // ===== RULE 2: Rapid transactions (>5 in 5 mins) =====
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentTxCount = await Transaction.countDocuments({
    sender: transaction.sender,
    createdAt: { $gte: fiveMinAgo },
  });
  if (recentTxCount >= 5) {
    riskScore += 30;
    reasons.push("Too many transactions in short time");
  }

  // ===== BEHAVIOR PROFILING — fetch past completed transactions =====
  const pastTx = await Transaction.find({
    sender: transaction.sender,
    status: "completed",
  }).sort({ createdAt: -1 });

  // ===== RULE 3: First transaction ever — only flag if amount is large =====
  if (pastTx.length === 0) {
    if (transaction.amount > 100000) {
      riskScore += 20;
      reasons.push("Large amount on first ever transaction");
    }
    // New account with normal amount — skip remaining behavior rules, not enough history
    if (riskScore > 100) riskScore = 100;
    // Still run device/location/blacklist checks but skip profiling rules below
  }

  // ===== RULE 4: Dormant account (no transaction in 30+ days) =====
  if (pastTx.length > 0) {
    const lastTxDate  = new Date(pastTx[0].createdAt);
    const daysSinceLast = (Date.now() - lastTxDate) / (1000 * 60 * 60 * 24);
    if (daysSinceLast > 30) {
      riskScore += 25;
      reasons.push(`Account dormant for ${Math.floor(daysSinceLast)} days, now suddenly active`);
    }
  }

  // ===== RULE 5: Amount 3x higher than personal average (min 5 past tx) =====
  if (pastTx.length >= 5) {
    const avgAmount = pastTx.reduce((sum, t) => sum + t.amount, 0) / pastTx.length;
    if (transaction.amount > avgAmount * 3) {
      const amountMultiple = transaction.amount / avgAmount;
      riskScore += 20;
      reasons.push(`Amount (${transaction.amount.toLocaleString()}) is ${amountMultiple.toFixed(1)}x higher than personal average (${Math.round(avgAmount).toLocaleString()})`);
    }
  }

  // ===== RULE 6: Daily total amount velocity =====
  if (pastTx.length >= 3) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTx = await Transaction.find({
      sender: transaction.sender,
      status: "completed",
      createdAt: { $gte: todayStart },
    });
    const todayTotal = todayTx.reduce((sum, t) => sum + t.amount, 0) + transaction.amount;

    // Calculate average daily total from past data
    const firstTx = pastTx[pastTx.length - 1];
    const daysSinceFirst = Math.max(1, Math.ceil((Date.now() - new Date(firstTx.createdAt)) / (1000 * 60 * 60 * 24)));
    const totalAllTime   = pastTx.reduce((sum, t) => sum + t.amount, 0);
    const avgDailyTotal  = totalAllTime / daysSinceFirst;

    if (avgDailyTotal > 0 && todayTotal > avgDailyTotal * 4) {
      riskScore += 25;
      reasons.push(`Today's total (${todayTotal.toLocaleString()} RWF) is 4x higher than daily average (${Math.round(avgDailyTotal).toLocaleString()} RWF)`);
    }
  }

  // ===== RULE 7: Round number detection (only for large amounts) =====
  const isRound = transaction.amount % 10000 === 0 || transaction.amount % 5000 === 0;
  if (isRound && transaction.amount >= 100000) {
    riskScore += 10;
    reasons.push("Suspiciously round transaction amount");
  }

  // ===== RULE 8: Unknown receiver (min 5 past tx) =====
  if (pastTx.length >= 5) {
    const receiverPhone = String(transaction.receiver || "").trim();
    const hasSentToReceiverBefore = pastTx.some(t =>
      String(t.receiver || "").trim() === receiverPhone
    );

    if (!hasSentToReceiverBefore) {
      riskScore += 20;
      reasons.push("Sending to an unknown receiver");
    }
  }

  // ===== RULE 9: Receiver risk score (involved in past blocked/flagged) =====
  const receiverBadTx = await Transaction.countDocuments({
    $or: [{ sender: transaction.receiver }, { receiver: transaction.receiver }],
    status: { $in: ["blocked", "flagged"] },
    reviewStatus: { $ne: "false_positive" },
  });
  if (receiverBadTx >= 3) {
    riskScore += 30;
    reasons.push(`Receiver has been involved in ${receiverBadTx} flagged/blocked transactions`);
  } else if (receiverBadTx >= 1) {
    riskScore += 15;
    reasons.push(`Receiver has been involved in ${receiverBadTx} flagged/blocked transaction(s)`);
  }

  // ===== RULE 10: Suspicious sender (repeatedly flagged) =====
  const senderFraudCount = await FraudAlert.countDocuments({
    sender: transaction.sender,
    reviewStatus: { $ne: "false_positive" },
  });
  if (senderFraudCount >= 5) {
    riskScore += 30;
    reasons.push(`Sender has triggered ${senderFraudCount} fraud alerts previously`);
  } else if (senderFraudCount >= 2) {
    riskScore += 15;
    reasons.push(`Sender has triggered ${senderFraudCount} fraud alerts previously`);
  }

  // ===== RULE 11: Unusual transaction type (min 5 past tx) =====
  if (pastTx.length >= 5) {
    const usedTypes = [...new Set(pastTx.map(t => t.type))];
    if (!usedTypes.includes(transaction.type)) {
      riskScore += 15;
      reasons.push(`Unusual transaction type: ${transaction.type} (never used before)`);
    }
  }

  // ===== RULE 12: Unusual transaction hour =====
  const hour = new Date().getHours();
  if (pastTx.length >= 5) {
    const usualHours = pastTx.map(t => new Date(t.createdAt).getHours());
    const avgHour    = usualHours.reduce((a, b) => a + b, 0) / usualHours.length;
    if (Math.abs(hour - avgHour) > 6) {
      riskScore += 10;
      reasons.push("Transaction at unusual hour for this user");
    }
  } else if (hour < 6 || hour > 23) {
    riskScore += 10;
    reasons.push("Unusual transaction time");
  }

  // ===== RULE 13: New device =====
  if (transaction.deviceId) {
    const knownDevices = await Transaction.distinct("deviceId", { sender: transaction.sender });
    if (knownDevices.length > 0 && !knownDevices.includes(transaction.deviceId)) {
      riskScore += 20;
      reasons.push("New device detected");
    }
  }

  // ===== RULE 14: New location =====
  const knownLocations = await Transaction.distinct("location", { sender: transaction.sender });
  if (knownLocations.length > 0 && !knownLocations.includes(transaction.location)) {
    riskScore += 20;
    reasons.push("Unusual location detected");
  }

  // A higher-than-usual amount is common in real life: rent, school fees,
  // business payments, emergencies, etc. Treat it as a step-up verification
  // signal, not a standalone blocking reason.
  const hardRiskReasons = reasons.filter(reason =>
    !reason.includes("higher than personal average") &&
    !reason.includes("Suspiciously round transaction amount")
  );

  if (hardRiskReasons.length === 0 && riskScore > 55) {
    riskScore = 55;
  }

  // ===== Cap at 100 =====
  if (riskScore > 100) riskScore = 100;

  return { riskScore, reasons };
};

// Log fraud event to FraudAlert collection
const logFraudAlert = async (transaction, riskScore, reasons, action) => {
  try {
    return await FraudAlert.create({
      sender:   transaction.sender,
      receiver: transaction.receiver,
      amount:   transaction.amount,
      riskScore,
      reasons,
      action,
      deviceId: transaction.deviceId,
      location: transaction.location,
    });
  } catch (err) {
    console.error("Failed to log fraud alert:", err.message);
    return null;
  }
};

module.exports = { calculateRisk, logFraudAlert };
