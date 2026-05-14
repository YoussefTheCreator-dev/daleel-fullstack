const nodemailer = require('nodemailer');

/**
 * Service to handle Gmail notifications using NodeMailer
 * For demo: Use a Gmail account with an "App Password"
 */
class GmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // Not your real password, an "App Password"
      },
    });
  }

  /**
   * Send an Email notification
   */
  async sendEmail(to, subject, html) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
      return;
    }

    const mailOptions = {
      from: `"Daleel University Advising" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: ' + info.response);
    } catch (err) {
      console.error('Error sending email:', err);
    }
  }

  /**
   * Generate booking confirmation HTML
   */
  getBookingHtml(userName, seniorName, slot, type) {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #3d6b4f;">Booking Confirmed! ✅</h2>
        <p>Hi ${userName},</p>
        <p>Your advising session with <strong>${seniorName}</strong> is confirmed.</p>
        <div style="background: #f5f3ef; padding: 15px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Time:</strong> ${slot}</p>
          <p><strong>Type:</strong> ${type === 'call' ? 'Video Call (Link will be sent)' : 'In Person (Meet at Campus Center)'}</p>
        </div>
        <p>Good luck with your session!</p>
        <hr>
        <p style="font-size: 12px; color: #999;">Sent via Daleel ADU Student Platform</p>
      </div>
    `;
  }
}

module.exports = new GmailService();
