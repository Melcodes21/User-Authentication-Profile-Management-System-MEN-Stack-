const express = require("express");
const router = express.Router();
const { confirmOTP } = require("../controllers/otpController");

router.post("/verify-otp", confirmOTP);

module.exports = router;
