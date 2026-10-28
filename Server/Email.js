const { createHash, randomInt, timingSafeEqual } = require("crypto");
const Sendemail = require("./sending_email");

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const otpStore = new Map();

function hashOtp(email, otp) {
  return createHash("sha256").update(`${email}:${otp}`).digest();
}

function getResendDelay(email) {
  const record = otpStore.get(email);
  if (!record) return 0;
  return Math.max(
    0,
    Math.ceil((record.sentAt + RESEND_COOLDOWN_MS - Date.now()) / 1000),
  );
}

async function sendOtp(email) {
  const retryAfterSeconds = getResendDelay(email);
  if (retryAfterSeconds > 0) {
    return { sent: false, retryAfterSeconds };
  }

  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const message = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#20213a">
      <h2>Verify your Habit Tracker email</h2>
      <p>Enter this 6-digit code in the app to finish creating your account:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p>
      <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `;

  await Sendemail(email, message, "Your Habit Tracker verification code");
  otpStore.set(email, {
    hash: hashOtp(email, otp),
    expiresAt: Date.now() + OTP_LIFETIME_MS,
    sentAt: Date.now(),
    attempts: 0,
  });
  console.log(otp);
  return { sent: true };
}

function verifyOtp(email, otp) {
  const record = otpStore.get(email);
  if (!record) return false;

  if (Date.now() > record.expiresAt || record.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(email);
    return false;
  }

  record.attempts += 1;
  const candidateHash = hashOtp(email, otp);
  const matches = timingSafeEqual(record.hash, candidateHash);

  if (matches || record.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(email);
  }

  return matches;
}

module.exports = { sendOtp, verifyOtp, getResendDelay };
