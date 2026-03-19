import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { emailQueue } from "../lib/jobs/emailQueue";
import { env } from "../lib/utils/environment";
import { handleActionError } from "./utils";

export const submitContactForm = defineAction({
  accept: "json",
  input: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(1, "Message is required"),
    hp_field: z.string().optional(), // Simple honeypot
  }),
  handler: async (input, context) => {
    // 1. Abuse Filtering: Honeypot check
    // bots often fill all hidden fields to be 'safe'
    if (input.hp_field && input.hp_field.length > 0) {
      console.warn(`[AbuseFilter] Honeypot triggered from IP: ${context.clientAddress}`);
      // Return success but don't actually do anything (silent fail for bots)
      return { success: true, bot: true };
    }

    // 2. Abuse Filtering: Simple Rate Limiting (basic)
    // We can also potentially check context.clientAddress if we had a Redis-based rate limiter
    // But for "basic" filtering, honeypot is a great start.

    const contactEmail = env("CONTACT_EMAIL") || "hello@govoterutherford.com";

    // Build the email body
    const body = `
New Contact Form Submission:

From: ${input.name} <${input.email}>
Subject: ${input.subject}

Message:
${input.message}

---
Sent via Vote Rutherford Contact Form
    `.trim();

    try {
      // Add the email to the outgoing queue
      await emailQueue.add('send-email', {
        emailAddress: contactEmail,
        subject: `[Contact Form] ${input.subject}`,
        body: body,
      });

      console.log(`[ContactForm] Successfully queued email from ${input.email}`);
      return { success: true };
    } catch (err) {
      handleActionError(err, "Failed to queue contact email submission");
    }
  },
});
