const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2");
const { rateLimit } = require("express-rate-limit");
const { sendOtp, verifyOtp } = require("./Email");
const createTodayRouter = require("./Today");
const createTomorrowRouter = require("./Tomorrow");
const createWeekRouter = require("./weekTracker");
const createHistoryRouter = require("./history");
const requireLogin = require("./auth");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

if (!JWT_SECRET && require.main === module) {
  throw new Error("JWT_SECRET is missing. Add it to Server/.env.");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(cookieParser());

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "Habit_Tracker",
  waitForConnections: true,
  connectionLimit: Math.max(1, Number(process.env.DB_CONNECTION_LIMIT) || 5),
  queueLimit: 0,
});

app.use("/api", (req, res, next) => {
  if (!JWT_SECRET) {
    return res.status(503).json({
      success: false,
      message: "The API server is missing its JWT_SECRET configuration.",
    });
  }
  return next();
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many signup attempts. Please try again later." },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many code attempts. Please request a new code later." },
});

const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many code requests. Please try again later." },
});

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function databaseQuery(sql, values) {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

app.use("/api/today", createTodayRouter({ databaseQuery, jwtSecret: JWT_SECRET }));
app.use("/api/tomorrow", createTomorrowRouter({ databaseQuery, jwtSecret: JWT_SECRET }));
app.use("/api/week", createWeekRouter({ databaseQuery, jwtSecret: JWT_SECRET }));
app.use("/api/history", createHistoryRouter({ databaseQuery, jwtSecret: JWT_SECRET }));

app.get("/api/session", requireLogin(JWT_SECRET), async (req, res) => {
  try {
    const users = await databaseQuery(
      "SELECT id, name, email FROM users WHERE id = ? LIMIT 1",
      [req.userId],
    );
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Please log in again." });
    }
    return res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error("Failed to verify login session:", error.message);
    return res.status(500).json({ success: false, message: "Could not verify your login session." });
  }
});

function isDuplicateEmailError(error) {
  return error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062);
}

async function clearPendingSignup(email) {
  try {
    await databaseQuery("DELETE FROM pending_signups WHERE email = ?", [email]);
  } catch (error) {
    console.error("Failed to clear pending signup:", error.message);
  }
}

// Signup stays pending until the email code is verified. Only the password hash
// is stored in the pending-signup table; the existing users table schema is unchanged.
app.post("/api/signup", signupLimiter, async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!name || name.length > 100 || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Enter a valid name and email address." });
  }

  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters and no more than 72 bytes.",
    });
  }

  let existingUsers;
  try {
    existingUsers = await databaseQuery(
      "SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1",
      [email],
    );
  } catch (error) {
    console.error("Signup database lookup failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create an account right now. Please try again.",
    });
  }

  if (existingUsers.length > 0) {
    return res.status(409).json({ success: false, message: "An account with this email already exists." });
  }

  let passwordHash;
  try {
    passwordHash = await bcrypt.hash(password, 10);
  } catch (error) {
    console.error("Hashing signup password failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to create an account right now." });
  }

  let sendResult;
  try {
    sendResult = await sendOtp(email, { name, passwordHash }, databaseQuery);
  } catch (error) {
    console.error("Sending verification email failed:", error.message);
    return res.status(502).json({
      success: false,
      message: "We couldn't send the verification email. Check the server email settings and try again.",
    });
  }

  if (!sendResult.sent) {
    return res.json({
      success: true,
      message: "A verification code was already sent. Check your email to finish creating your account.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Verification code sent. Check your email to finish creating your account.",
  });
});

app.post("/api/resend-otp", resendOtpLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Enter a valid email address." });
  }

  let pendingSignups;
  try {
    pendingSignups = await databaseQuery(
      "SELECT name, password_hash FROM pending_signups WHERE email = ? LIMIT 1",
      [email],
    );
  } catch (error) {
    console.error("Failed to load pending signup:", error.message);
    return res.status(500).json({ success: false, message: "Could not resend the code right now." });
  }

  if (pendingSignups.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No pending signup was found. Please create your account again.",
    });
  }

  try {
    const sendResult = await sendOtp(
      email,
      { name: pendingSignups[0].name, passwordHash: pendingSignups[0].password_hash },
      databaseQuery,
    );
    if (!sendResult.sent) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${sendResult.retryAfterSeconds} seconds before requesting another code.`,
        retryAfterSeconds: sendResult.retryAfterSeconds,
      });
    }
    return res.json({ success: true, message: "A new verification code was sent." });
  } catch (error) {
    console.error("Resending verification email failed:", error.message);
    return res.status(502).json({
      success: false,
      message: "We couldn't send the email. Check the server email settings and try again.",
    });
  }
});

app.post("/api/verify-otp", verifyOtpLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : String(req.body?.otp ?? "");

  if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: "Enter the email address and 6-digit code." });
  }

  let pendingSignups;
  try {
    pendingSignups = await databaseQuery(
      "SELECT name, password_hash FROM pending_signups WHERE email = ? LIMIT 1",
      [email],
    );
  } catch (error) {
    console.error("Failed to load pending signup:", error.message);
    return res.status(500).json({ success: false, message: "Could not verify the code right now." });
  }

  if (pendingSignups.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No pending signup was found. Request a new code by signing up again.",
    });
  }

  let codeIsValid;
  try {
    codeIsValid = await verifyOtp(email, otp, databaseQuery);
  } catch (error) {
    console.error("Failed to verify signup code:", error.message);
    return res.status(500).json({ success: false, message: "Could not verify the code right now." });
  }
  if (!codeIsValid) {
    return res.status(400).json({ success: false, message: "That code is incorrect or expired." });
  }

  const pendingSignup = pendingSignups[0];
  try {
    await databaseQuery(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [pendingSignup.name, email, pendingSignup.password_hash],
    );
    await clearPendingSignup(email);
    return res.json({ success: true, message: "Email verified and account created successfully." });
  } catch (error) {
    await clearPendingSignup(email);
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    console.error("Creating verified account failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Your email was verified, but we couldn't create the account. Please sign up again.",
    });
  }
});

app.post("/api/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ success: false, message: "Enter a valid email and password." });
  }

  try {
    const users = await databaseQuery("SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1", [email]);
    if (users.length === 0 || !(await bcrypt.compare(password, users[0].password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const token = jwt.sign({ id: users[0].id, email: users[0].email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    return res
      .cookie("token", token, {
        ...authCookieOptions,
        maxAge: 60 * 60 * 1000,
      })
      .json({ success: true, message: "Logged in successfully." });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to log in right now." });
  }
});

app.post("/api/logout", (req, res) => {
  return res
    .clearCookie("token", authCookieOptions)
    .json({ success: true, message: "Logged out successfully." });
});

app.use("/api", (req, res) => {
  return res.status(404).json({ success: false, message: "API route not found." });
});

const clientBuildPath = path.join(__dirname, "..", "public");
app.use(express.static(clientBuildPath));
app.get(/.*/, (req, res) => {
  const indexPath = path.join(clientBuildPath, "index.html");
  return res.sendFile(indexPath, (error) => {
    if (!error || res.headersSent) return;
    if (error.code === "ENOENT") {
      return res.status(404).send("Client build not found. Run the Client build before starting the production server.");
    }
    return res.status(500).send("Could not load the client application.");
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (req.path.startsWith("/api/")) {
    const status = Number.isInteger(error.status) && error.status >= 400 ? error.status : 500;
    const message = error.type === "entity.parse.failed"
      ? "Request body must be valid JSON."
      : "The API request could not be completed.";

    if (status >= 500) console.error("Unhandled API request error:", error.message);
    return res.status(status).json({ success: false, message });
  }

  return next(error);
});

if (require.main === module) {
  db.getConnection((error, connection) => {
    if (error) {
      console.error("Database connection failed:", error.message);
      db.end();
      process.exitCode = 1;
      return;
    }

    connection.release();
    console.log("Connected to the Habit Tracker database.");
    app.listen(PORT, () => {
      console.log(`Habit Tracker running at http://localhost:${PORT}`);
    });
  });
}

module.exports = app;
