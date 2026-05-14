const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

/**
 * Service to handle Microsoft Graph API integrations
 * Note: Requires a valid access token obtained via MSAL
 */
class GraphService {
  constructor(accessToken) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Send an Outlook Email confirmation
   */
  async sendEmail(to, subject, content) {
    const mail = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: content,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
    };

    try {
      await this.client.api('/me/sendMail').post(mail);
      console.log(`Email sent to ${to}`);
    } catch (err) {
      console.error('Error sending email:', err);
    }
  }

  /**
   * Create an Outlook Calendar Event
   */
  async createCalendarEvent(startTime, endTime, subject, location) {
    const event = {
      subject: subject,
      start: {
        dateTime: startTime, // ISO format: '2026-05-14T12:00:00'
        timeZone: 'Arabian Standard Time',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Arabian Standard Time',
      },
      location: {
        displayName: location,
      },
    };

    try {
      const res = await this.client.api('/me/events').post(event);
      console.log(`Calendar event created: ${res.id}`);
      return res;
    } catch (err) {
      console.error('Error creating calendar event:', err);
    }
  }

  /**
   * Send a Microsoft Teams Message
   * Note: Requires 'Chat.ReadWrite' or 'ChatMessage.Send' permissions
   */
  async sendTeamsMessage(chatId, message) {
    const chatMessage = {
      body: {
        content: message,
      },
    };

    try {
      await this.client.api(`/chats/${chatId}/messages`).post(chatMessage);
      console.log(`Teams message sent to chat ${chatId}`);
    } catch (err) {
      console.error('Error sending Teams message:', err);
    }
  }
}

module.exports = GraphService;
