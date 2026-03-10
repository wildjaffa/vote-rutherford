export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string; // HTML body
  candidateId?: string | undefined; // Optional if this is sent to a candidate
}

export interface EmailProvider {
  /**
   * Sends an email and returns true if successful.
   */
  sendEmail(options: SendEmailOptions): Promise<boolean>;
}
