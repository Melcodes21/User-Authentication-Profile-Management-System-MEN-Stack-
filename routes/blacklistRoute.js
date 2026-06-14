const express = require("express");
const router  = express.Router();
const { blacklistNumber, getBlacklist, removeFromBlacklist } = require("../controllers/blacklistController");
const { protect } = require("../middleware/auth");

router.post("/",              protect, blacklistNumber);
router.get("/",               protect, getBlacklist);
router.delete("/:phoneNumber", protect, removeFromBlacklist);

module.exports = router;
