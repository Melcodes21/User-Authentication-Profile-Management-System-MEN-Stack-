const Blacklist = require("../models/Blacklist");
const User = require("../models/User");

const isUserReport = (entry) => entry.reportedByRole === "user";

// Add a number to blacklist
const blacklistNumber = async (req, res) => {
  try {
    const { phoneNumber, reason } = req.body;
    if (!phoneNumber || !reason) return res.status(400).json({ message: "Phone number and reason are required" });

    // Check the number is a registered user
    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: "Phone number is not a registered user" });

    const existing = await Blacklist.findOne({ phoneNumber });
    if (existing) return res.status(409).json({ message: "Number already blacklisted" });

    const entry = new Blacklist({
      phoneNumber,
      reason,
      blacklistedBy: req.user?.phoneNumber || "system",
      reportedByRole: req.user?.role || "user",
    });
    await entry.save();

    res.status(201).json({ message: "Number blacklisted successfully", entry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all blacklisted numbers
const getBlacklist = async (req, res) => {
  try {
    const filter = req.user?.role === "admin" ? {} : { blacklistedBy: req.user.phoneNumber };
    const list = await Blacklist.find(filter).sort({ createdAt: -1 });

    if (req.user?.role === "admin") {
      const userReportedTotal = list.filter(isUserReport).length;
      return res.status(200).json({ total: list.length, userReportedTotal, list });
    }

    res.status(200).json({ total: list.length, list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove a number from blacklist
const removeFromBlacklist = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const filter = req.user?.role === "admin"
      ? { phoneNumber }
      : { phoneNumber, blacklistedBy: req.user.phoneNumber };
    const deleted = await Blacklist.findOneAndDelete(filter);
    if (!deleted) return res.status(404).json({ message: "Number not found in blacklist" });

    res.status(200).json({ message: "Number removed from blacklist" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { blacklistNumber, getBlacklist, removeFromBlacklist };
