import nodemailer from 'nodemailer';

/**
 * Sends an email using the configured SMTP transporter.
 * @param {object} options The email options.
 * @param {string} options.to The recipient's email address.
 * @param {string} options.subject The subject of the email.
 * @param {string} options.text The plain text body of the email.
 * @param {string} [options.html] The HTML body of the email
 */
const sendEmail = async (options) => {
  // A transporter object using SMTP transport.

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port:Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER, 
      pass: process.env.SMTP_PASS, 
    },
    tls: {
      // This is required for servers with self-signed certificates or hostname mismatches.
      // It bypasses the certificate validation.
      rejectUnauthorized: false,
    },
  });

  // Email options.
  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`, // sender address
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  //Send the email.
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export default sendEmail;
