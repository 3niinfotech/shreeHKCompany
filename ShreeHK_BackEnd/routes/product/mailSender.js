const nodemailer = require("nodemailer");

const getMailConfig = () => ({
  host: process.env.SMTP_HOST || "",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.MAIL_FROM || process.env.SMTP_USER || "",
  fromName: process.env.MAIL_FROM_NAME || "Shreehk",
});

const sendInventoryMail = async ({ to, subject, html, attachments = [] }) => {
  const config = getMailConfig();
  if (!config.host || !config.user || !config.pass) {
    const error = new Error(
      "Mail server is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env"
    );
    error.statusCode = 500;
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.from}>`,
    to,
    subject,
    html,
    attachments,
  });
};

module.exports = {
  sendInventoryMail,
};
