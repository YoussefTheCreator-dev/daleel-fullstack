const fetch = require('node-fetch');

/**
 * Service to handle Telegram notifications
 * No complex credentials needed, just a Bot Token from @BotFather
 */
class TelegramService {
  constructor() {
    this.token = process.env.TELEGRAM_TOKEN;
    // For demo purposes, we can use a hardcoded chat ID or let users provide theirs
    this.adminChatId = process.env.TELEGRAM_CHAT_ID; 
  }

  /**
   * Send a message via Telegram
   */
  async sendMessage(chatId, text) {
    const targetChatId = chatId || this.adminChatId;
    if (!this.token || !targetChatId) {
      console.log(`[Telegram Mock] To: ${targetChatId}, Message: ${text}`);
      return;
    }

    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: text,
          parse_mode: 'HTML'
        }),
      });
      const data = await res.json();
      if (data.ok) {
        console.log('Telegram message sent!');
      } else {
        console.error('Telegram Error:', data.description);
      }
    } catch (err) {
      console.error('Error calling Telegram API:', err);
    }
  }

  /**
   * Format the booking message
   */
  getBookingMessage(userName, seniorName, slot, type) {
    return `
<b>New Booking Confirmed! ✅</b>

👤 <b>Freshman:</b> ${userName}
🎓 <b>Senior:</b> ${seniorName}
⏰ <b>Time:</b> ${slot}
📍 <b>Type:</b> ${type === 'call' ? '📞 Video Call' : '🏢 In Person'}

<i>Sent via Daleel ADU Platform</i>
    `;
  }
}

module.exports = new TelegramService();
