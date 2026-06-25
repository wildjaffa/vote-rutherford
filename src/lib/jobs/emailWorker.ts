import { Worker, type Job, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { getEmailProvider } from "../services/email/EmailFactory";
import type { SendEmailJobData } from "./emailQueue";
import prisma from "../prisma";
import "dotenv/config";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

export const spawnEmailWorker = () => {
  const worker = new Worker<SendEmailJobData>(
    "email-outreach",
    async (job: Job<SendEmailJobData>) => {
      const { candidateId, contactId, emailAddress, subject, body, userGoogleAccountId } = job.data;

      let success = false;
      let errorMessage: string | null = null;

      try {
        const provider = await getEmailProvider(userGoogleAccountId);
        success = await provider.sendEmail({
          to: emailAddress,
          subject,
          body,
          candidateId: candidateId ?? undefined,
        });

        if (!success) {
          errorMessage = "Provider reported failure (returned false)";
        }
      } catch (err: unknown) {
        success = false;
        errorMessage = err instanceof Error ? err.message : "Unknown error";
      }

      // Record outreach attempt in database
      await prisma.emailOutreach.create({
        data: {
          candidateId: candidateId || null,
          contactId: contactId || null,
          emailAddress,
          subject,
          body,
          status: success ? "SENT" : "FAILED",
          errorMessage,
          sentAt: new Date(),
        },
      });

      if (!success) {
        throw new Error(errorMessage || "Email sending failed");
      }

      return { success: true };
    },
    { connection: connection as unknown as ConnectionOptions, concurrency: 5 },
  );

  worker.on("completed", (job) => {
    console.log(`[EmailWorker] Job ${job.id} has completed!`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[EmailWorker] Job ${job?.id} has failed with ${err.message}`,
    );
  });

  return worker;
};

// Start the worker if this module is run directly via node
const url = import.meta.url;
if (url === `file://${process.argv[1]}`) {
  console.log("Starting stand-alone email worker process...");
  spawnEmailWorker();
  console.log("Email worker running. Press Ctrl+C to stop.");
}
