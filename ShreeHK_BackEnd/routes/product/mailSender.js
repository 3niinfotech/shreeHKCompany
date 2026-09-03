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
    console.warn(
      `[MailSender] SMTP server is not configured in backend/.env (SMTP_HOST, SMTP_USER, or SMTP_PASS missing). Simulating mail delivery to: ${to}`
    );
    return {
      simulated: true,
      message: `Mail server is not configured in .env. Simulated mail delivery to ${to}`,
    };
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

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.from}>`,
      to,
      subject,
      html,
      attachments,
    });
  } catch (error) {
    const smtpError = new Error(
      error?.response || error?.message || "Failed to send email. Check SMTP settings in backend .env"
    );
    smtpError.statusCode = 502;
    throw smtpError;
  }

  return { simulated: false };
};

module.exports = {
  sendInventoryMail,
};
