const { createHash, randomInt, timingSafeEqual } = require("crypto");
const Sendemail = require("./sending_email");

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function hashOtp(email, otp) {
  return createHash("sha256").update(`${email}:${otp}`).digest();
}

async function getResendDelay(email, databaseQuery) {
  const rows = await databaseQuery(
    "SELECT otp_sent_at_ms FROM pending_signups WHERE email = ? LIMIT 1",
    [email],
  );
  if (rows.length === 0) return 0;

  const sentAt = Number(rows[0].otp_sent_at_ms);
  return Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_MS - Date.now()) / 1000));
}

async function sendOtp(email, { name, passwordHash }, databaseQuery) {
  await databaseQuery("DELETE FROM pending_signups WHERE otp_expires_at_ms <= ?", [Date.now()]);

  const retryAfterSeconds = await getResendDelay(email, databaseQuery);
  if (retryAfterSeconds > 0) {
    return { sent: false, retryAfterSeconds };
  }

  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = Date.now();
  await databaseQuery(
    `INSERT INTO pending_signups
      (email, name, password_hash, otp_hash, otp_expires_at_ms, otp_sent_at_ms, otp_attempts)
     VALUES (?, ?, ?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      password_hash = VALUES(password_hash),
      otp_hash = VALUES(otp_hash),
      otp_expires_at_ms = VALUES(otp_expires_at_ms),
      otp_sent_at_ms = VALUES(otp_sent_at_ms),
      otp_attempts = 0`,
    [email, name, passwordHash, hashOtp(email, otp), now + OTP_LIFETIME_MS, now],
  );

  const message = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#20213a">
      <h2>Verify your Habit Tracker email</h2>
      <p>Enter this 6-digit code in the app to finish creating your account:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p>
      <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `;

  try {
    await Sendemail(email, message, "Your Habit Tracker verification code");
  } catch (error) {
    await databaseQuery(
      "UPDATE pending_signups SET otp_expires_at_ms = 0, otp_sent_at_ms = 0 WHERE email = ?",
      [email],
    );
    throw error;
  }

  return { sent: true };
}

async function verifyOtp(email, otp, databaseQuery) {
  const rows = await databaseQuery(
    "SELECT otp_hash, otp_expires_at_ms, otp_attempts FROM pending_signups WHERE email = ? LIMIT 1",
    [email],
  );
  if (rows.length === 0) return false;

  const record = rows[0];
  const attempts = Number(record.otp_attempts);
  if (Date.now() > Number(record.otp_expires_at_ms) || attempts >= MAX_OTP_ATTEMPTS) {
    await databaseQuery(
      "UPDATE pending_signups SET otp_expires_at_ms = 0, otp_sent_at_ms = 0, otp_attempts = 0 WHERE email = ?",
      [email],
    );
    return false;
  }

  await databaseQuery(
    "UPDATE pending_signups SET otp_attempts = otp_attempts + 1 WHERE email = ?",
    [email],
  );

  const storedHash = Buffer.from(record.otp_hash);
  const matches = timingSafeEqual(storedHash, hashOtp(email, otp));
  if (!matches && attempts + 1 >= MAX_OTP_ATTEMPTS) {
    await databaseQuery(
      "UPDATE pending_signups SET otp_expires_at_ms = 0, otp_sent_at_ms = 0, otp_attempts = 0 WHERE email = ?",
      [email],
    );
  }

  return matches;
}

module.exports = { sendOtp, verifyOtp, getResendDelay };
