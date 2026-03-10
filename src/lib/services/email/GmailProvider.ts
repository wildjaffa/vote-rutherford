import { google } from 'googleapis';
import type { EmailProvider, SendEmailOptions } from "./EmailProvider";

/**
 * GmailProvider uses the Google Gmail API to send emails.
 * It requires OAuth2 credentials (Client ID, Client Secret, Refresh Token).
 */
export class GmailProvider implements EmailProvider {
  /**
   * Initializes and returns an authenticated Gmail client.
   * This uses OAuth2 for authentication. We use 'me' as the userId
   * because the refresh token belongs to the authorized user (CONTACT_EMAIL).
   */
  private async getGmailClient() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    const fromEmail = process.env.CONTACT_EMAIL || "govoterutherford@gmail.com";

    if (!clientId || !clientSecret || !refreshToken) {
      console.error("[GmailProvider] Missing Gmail API environment variables.");
      return null;
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        "https://developers.google.com/oauthplayground" // Standard redirect for refresh token generation
      );
      
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      return {
        gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
        fromEmail
      };
    } catch (e) {
      console.error("[GmailProvider] Failed to initialize Gmail auth client:", e);
      return null;
    }
  }

  /**
   * Sends an email via Gmail API's messages.send method.
   * Documentation: https://developers.google.com/workspace/gmail/api/guides/sending
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const context = await this.getGmailClient();
    
    if (!context) {
      console.error("[GmailProvider] Skipping send email: Client not configured or failed to initialize.");
      // In production, we might want to log this but return true if we're in dry-run,
      // but here we return false as it failed to send.
      return false;
    }

    const { gmail, fromEmail } = context;

    try {
      // Step 1: Create a raw email in MIME format (RFC 2822).
      // We manually build a simple MIME message.
      // We use base64 encoding for the subject if it contains special characters.
      const encodedSubject = Buffer.from(options.subject).toString("base64");
      const utf8Subject = `=?utf-8?B?${encodedSubject}?=`;

      const str = [
        `From: ${fromEmail}`,
        `To: ${options.to}`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        `Subject: ${utf8Subject}`,
        '',
        options.body,
      ].join('\r\n'); // Use \r\n as per MIME specs

      // Step 2: Base64url encode the entire MIME message.
      const encodedMessage = Buffer.from(str).toString('base64url');

      // Step 3: Call the Gmail API's send method.
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log(`[GmailProvider] Successfully sent email to ${options.to}`);
      return true;
    } catch (error) {
      console.error(`[GmailProvider] Error sending email to ${options.to}:`, error);
      return false;
    }
  }
}
