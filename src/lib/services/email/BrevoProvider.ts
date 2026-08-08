import type { EmailProvider, SendEmailOptions } from "./EmailProvider";
import { env } from "../../utils/environment";

export class BrevoProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private replyToEmail: string;

  constructor() {
    this.apiKey = env("BREVO_API_KEY") || "";
    this.fromEmail = env("BREVO_FROM_EMAIL") || "updates@govoterutherford.com";
    this.fromName = env("BREVO_FROM_NAME") || "Vote Rutherford";
    this.replyToEmail = env("BREVO_REPLY_TO_EMAIL") || "";

    if (!this.apiKey) {
      console.warn("[BrevoProvider] BREVO_API_KEY is missing.");
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      console.error(
        "[BrevoProvider] Cannot send email, API key not initialized.",
      );
      return false;
    }

    try {
      const body: Record<string, unknown> = {
        sender: {
          name: this.fromName,
          email: this.fromEmail,
        },
        to: [
          {
            email: options.to,
          },
        ],
        subject: options.subject,
        htmlContent: options.body,
      };

      if (this.replyToEmail) {
        body.replyTo = {
          email: this.replyToEmail,
        };
      }

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": this.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          `[BrevoProvider] Failed to send email via Brevo. Status: ${response.status}. Error: ${errText}`,
        );
        return false;
      }

      console.log(`[BrevoProvider] Successfully sent email to ${options.to}`);
      return true;
    } catch (error) {
      console.error(
        `[BrevoProvider] Error sending email to ${options.to}:`,
        error,
      );
      return false;
    }
  }
}
