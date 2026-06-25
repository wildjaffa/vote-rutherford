import FormData from "form-data";
import Mailgun from "mailgun.js";
import type { EmailProvider, SendEmailOptions } from "./EmailProvider";
import { env } from "../../utils/environment";

interface MailgunClient {
  messages: {
    create(
      domain: string,
      data: Record<string, string | string[]>,
    ): Promise<unknown>;
  };
}

export class MailgunProvider implements EmailProvider {
  private client: MailgunClient | undefined;
  private domain: string;
  private fromEmail: string;
  private replyToEmail: string;

  constructor() {
    const apiKey = env("MAILGUN_API_KEY");
    this.domain = env("MAILGUN_DOMAIN") || "";
    this.fromEmail = env("MAILGUN_FROM_EMAIL") || `updates@${this.domain}`;
    this.replyToEmail = env("MAILGUN_REPLY_TO_EMAIL") || "";

    if (!apiKey || !this.domain) {
      console.warn(
        "[MailgunProvider] MAILGUN_API_KEY or MAILGUN_DOMAIN is missing.",
      );
    } else {
      const mailgun = new Mailgun(FormData);
      // mailgun.client() returns a complex object; cast via unknown into our light-weight interface
      this.client = mailgun.client({
        username: "api",
        key: apiKey,
      }) as unknown as MailgunClient;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.client) {
      console.error(
        "[MailgunProvider] Cannot send email, client not initialized.",
      );
      return false;
    }

    try {
      const messageData: Record<string, string | string[]> = {
        from: this.fromEmail,
        to: [options.to],
        subject: options.subject,
        html: options.body,
      };

      if (this.replyToEmail) {
        messageData["h:Reply-To"] = this.replyToEmail;
      }

      await this.client.messages.create(this.domain, messageData);
      console.log(`[MailgunProvider] Successfully sent email to ${options.to}`);
      return true;
    } catch (error) {
      console.error(
        `[MailgunProvider] Error sending email to ${options.to}:`,
        error,
      );
      return false;
    }
  }
}
