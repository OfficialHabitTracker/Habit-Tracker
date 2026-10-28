const nodemailer = require("nodemailer");

const emailUser = process.env.SMTP_USER || process.env.My_Email || process.env.My_email;
const emailPassword = process.env.SMTP_PASS || process.env.My_email_pass;

async function Sendemail(userEmail, message, subject) {
  if (!emailUser || !emailPassword) {
    throw new Error("SMTP_USER and SMTP_PASS must be configured in Server/.env.");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || emailUser,
    to: userEmail,
    subject,
    html: message,
  });

  console.log("Verification email sent:", info.messageId);
}

module.exports = Sendemail;
