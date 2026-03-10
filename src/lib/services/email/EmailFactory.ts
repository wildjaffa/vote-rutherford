import type { EmailProvider } from "./EmailProvider.js";
import { GmailProvider } from "./GmailProvider.js";

/**
 * Returns the configured EmailProvider based on environment variables.
 * Currently defaults to GmailProvider.
 */
export function getEmailProvider(): EmailProvider {
  // In the future this could return SendGridProvider, etc.
  // For now we default to GmailProvider.
  return new GmailProvider();
}
