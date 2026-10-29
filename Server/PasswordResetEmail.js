const { createHash, randomInt, timingSafeEqual } = require("crypto");
const Sendemail = require("./sending_email");

const CODE_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashCode(email, code) {
  return createHash("sha256").update(`${email}:${code}`).digest();
}

async function sendPasswordResetCode(email, databaseQuery) {
  const now = Date.now();
  await databaseQuery(
    "DELETE FROM password_reset_codes WHERE code_expires_at_ms <= ?",
    [now],
  );
  const recentCodes = await databaseQuery(
    "SELECT code_sent_at_ms FROM password_reset_codes WHERE email = ? LIMIT 1",
    [email],
  );
  if (recentCodes.length > 0) {
    const sentAt = Number(recentCodes[0].code_sent_at_ms);
    if (sentAt > 0 && sentAt + RESEND_COOLDOWN_MS > now) {
      return { sent: false };
    }
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await databaseQuery(
    `INSERT INTO password_reset_codes
      (email, code_hash, code_expires_at_ms, code_sent_at_ms, code_attempts)
     VALUES (?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE
      code_hash = VALUES(code_hash),
      code_expires_at_ms = VALUES(code_expires_at_ms),
      code_sent_at_ms = VALUES(code_sent_at_ms),
      code_attempts = 0`,
    [email, hashCode(email, code), now + CODE_LIFETIME_MS, now],
  );

  const message = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#20213a">
      <h2>Reset your Habit Tracker password</h2>
      <p>Enter this 6-digit code in the app to choose a new password:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
      <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `;

  try {
    await Sendemail(email, message, "Your Habit Tracker password reset code");
  } catch (error) {
    await databaseQuery(
      "UPDATE password_reset_codes SET code_expires_at_ms = 0, code_sent_at_ms = 0 WHERE email = ?",
      [email],
    );
    throw error;
  }

  return { sent: true };
}

function passwordResetCodeMatches(email, code, storedHashValue) {
  const storedHash = Buffer.from(storedHashValue);
  if (storedHash.length !== 32) return false;
  return timingSafeEqual(storedHash, hashCode(email, code));
}

module.exports = { sendPasswordResetCode, passwordResetCodeMatches };
