import prisma from "../../prisma";
import type { EmailProvider } from "./EmailProvider.js";
import { GmailProvider } from "./GmailProvider.js";
import { MailgunProvider } from "./MailgunProvider.js";
import { BrevoProvider } from "./BrevoProvider.js";
import { env } from "../../utils/environment";

/**
 * Returns the configured EmailProvider based on environment variables or specific user's Google Account.
 */
export async function getEmailProvider(
  userGoogleAccountId?: string | null,
): Promise<EmailProvider> {
  console.log("userGoogleAccountId", userGoogleAccountId);
  if (userGoogleAccountId === "system-brevo") {
    return new BrevoProvider();
  }
  if (userGoogleAccountId === "system-mailgun") {
    return new MailgunProvider();
  }

  if (userGoogleAccountId) {
    const account = await prisma.userGoogleAccount.findUnique({
      where: { id: userGoogleAccountId },
    });
    if (account) {
      return new GmailProvider(account.refreshToken, account.email);
    }
    throw new Error("No Google email account found for the provided ID");
  }

  if (env("BREVO_API_KEY")) {
    return new BrevoProvider();
  }
  return new MailgunProvider();
}
