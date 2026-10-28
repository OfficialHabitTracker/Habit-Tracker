const nodemailer = require("nodemailer");

function configurationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getSmtpSettings() {
  const emailUser = (
    process.env.SMTP_USER
    || process.env.My_Email
    || process.env.My_email
    || process.env.SMTP_FROM
    || ""
  ).trim();
  const emailPassword = process.env.SMTP_PASS || process.env.My_email_pass || "";
  if (!emailUser || !emailPassword.trim()) {
    throw configurationError(
      "EMAIL_CONFIG_MISSING",
      "Set SMTP_PASS and either SMTP_USER or SMTP_FROM in the Server deployment environment.",
    );
  }

  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw configurationError("EMAIL_CONFIG_INVALID", "SMTP_HOST or SMTP_PORT is invalid.");
  }

  const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (secureSetting && secureSetting !== "true" && secureSetting !== "false") {
    throw configurationError("EMAIL_CONFIG_INVALID", "SMTP_SECURE must be true or false.");
  }

  return {
    emailUser,
    emailPassword,
    host,
    port,
    secure: secureSetting ? secureSetting === "true" : port === 465,
    from: (process.env.SMTP_FROM || emailUser).trim(),
  };
}

async function Sendemail(userEmail, message, subject) {
  const settings = getSmtpSettings();

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: {
      user: settings.emailUser,
      pass: settings.emailPassword,
    },
  });

  const info = await transporter.sendMail({
    from: settings.from,
    to: userEmail,
    subject,
    html: message,
  });

  console.log("Verification email sent:", info.messageId);
}

module.exports = Sendemail;
