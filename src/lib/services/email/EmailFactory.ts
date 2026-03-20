import prisma from "../../prisma";
import type { EmailProvider } from "./EmailProvider.js";
import { GmailProvider } from "./GmailProvider.js";

/**
 * Returns the configured EmailProvider based on environment variables or specific user's Google Account.
 */
export async function getEmailProvider(
  userGoogleAccountId?: string,
): Promise<EmailProvider> {
  if (userGoogleAccountId) {
    const account = await prisma.userGoogleAccount.findUnique({
      where: { id: userGoogleAccountId },
    });
    if (account) {
      return new GmailProvider(account.refreshToken, account.email);
    }
  }
  throw new Error("No email account found");
}
