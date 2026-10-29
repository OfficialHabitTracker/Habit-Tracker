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

  const text = message
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6])\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();

  const info = await transporter.sendMail({
    from: settings.from,
    to: userEmail,
    subject,
    html: message,
    text,
  });

  const accepted = (info.accepted || []).some((recipient) => {
    const address = typeof recipient === "string" ? recipient : recipient?.address;
    return typeof address === "string" && address.toLowerCase() === userEmail.toLowerCase();
  });

  if (!accepted) {
    const error = new Error("The SMTP server did not accept the email recipient.");
    error.code = "EENVELOPE";
    throw error;
  }

  // SMTP acceptance confirms handoff to the provider, not final inbox delivery.
  console.log("Transactional email accepted by SMTP server:", {
    messageId: info.messageId,
    serverMessageId: info.serverMessageId,
    response: info.response,
    acceptedCount: info.accepted.length,
    rejectedCount: info.rejected?.length || 0,
  });
}

module.exports = Sendemail;
