const otpStore = new Map();

// generate OTP
const generateOTP = (phoneNumber, transactionData) => {
  const otp = Math.floor(100000 + Math.random() * 900000);

  otpStore.set(phoneNumber, {
    otp,
    transactionData,
    expiresAt: Date.now() + 5 * 60 * 1000,// 5 min
  });

  return otp;
};

// verify OTP
const verifyOTP = (phoneNumber, inputOtp) => {
  const record = otpStore.get(phoneNumber);

  if (!record) return { valid: false, reason: "No OTP found for this number" };

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phoneNumber);
    return { valid: false, reason: "OTP expired", transactionData: record.transactionData };
  }

  if (String(record.otp) !== String(inputOtp)) {
    return { valid: false, reason: "Invalid OTP", transactionData: record.transactionData };
  }

  otpStore.delete(phoneNumber);
  return { valid: true, transactionData: record.transactionData };
};

module.exports = { generateOTP, verifyOTP };