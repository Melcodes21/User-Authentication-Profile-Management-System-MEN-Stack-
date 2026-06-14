const AfricasTalking = require("africastalking");

const at = AfricasTalking({
  apiKey:   process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sms = at.SMS;

const sendSms = async (phoneNumber, message) => {
  try {
    // Africa's Talking requires numbers in international format e.g. +250781234567
    const formatted = phoneNumber.startsWith("+") ? phoneNumber : `+250${phoneNumber.substring(1)}`;

    const result = await sms.send({
      to:      [formatted],
      message,
    });

    console.log(`[SMS sent to ${formatted}]:`, result.SMSMessageData?.Message);
    return result;
  } catch (error) {
    console.error(`[SMS failed to ${phoneNumber}]:`, error.message);
    // Don't throw — SMS failure should never break the main transaction flow
  }
};

// ===== SMS TEMPLATES =====

const sendWelcomeSms = (phoneNumber, name) =>
  sendSms(phoneNumber,
    `Welcome to MTN MoMo, ${name}! Your number has been registered. NEVER share your PIN with anyone. MTN will NEVER call or SMS asking for your PIN. Beware of fraudsters.`
  );

const sendOtpSms = (phoneNumber, otp) =>
  sendSms(phoneNumber,
    `Your MTN MoMo OTP is: ${otp}. Valid for 5 minutes. Do NOT share this code with anyone. MTN will never ask for your OTP.`
  );

const sendTransactionSuccessSms = (phoneNumber, amount, receiver) =>
  sendSms(phoneNumber,
    `MTN MoMo: You have successfully sent RWF ${Number(amount).toLocaleString()} to ${receiver}. If you did not authorize this, call 100 immediately.`
  );

const sendTransactionBlockedSms = (phoneNumber, reason) =>
  sendSms(phoneNumber,
    `MTN MoMo ALERT: Your transaction was blocked. Reason: ${reason}. If this was not you, secure your account immediately or call 100.`
  );

const sendFailedPinSms = (phoneNumber, attemptsLeft) =>
  sendSms(phoneNumber,
    `MTN MoMo: Incorrect PIN entered. You have ${attemptsLeft} attempt(s) remaining before your account is locked. If this was not you, call 100 immediately.`
  );

const sendAccountLockedSms = (phoneNumber) =>
  sendSms(phoneNumber,
    `MTN MoMo ALERT: Your account has been temporarily locked due to multiple failed PIN attempts. It will unlock in 15 minutes. If this was not you, call 100 immediately.`
  );

// ===== BROADCAST SMS =====
const sendBroadcastSms = async (phoneNumbers, message) => {
  const formatted = phoneNumbers.map(p =>
    p.startsWith("+") ? p : `+250${p.substring(1)}`
  );
  try {
    const result = await sms.send({ to: formatted, message });
    console.log(`[Broadcast SMS to ${formatted.length} users]:`, result.SMSMessageData?.Message);
    return result;
  } catch (error) {
    console.error("[Broadcast SMS failed]:", error.message);
  }
};

module.exports = {
  sendWelcomeSms,
  sendOtpSms,
  sendTransactionSuccessSms,
  sendTransactionBlockedSms,
  sendFailedPinSms,
  sendAccountLockedSms,
  sendBroadcastSms,
};
