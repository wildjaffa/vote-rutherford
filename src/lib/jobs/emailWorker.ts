import { Worker, type Job, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { getEmailProvider } from "../services/email/EmailFactory";
import type { SendEmailJobData } from "./emailQueue";
import prisma from "../prisma";
import "dotenv/config";

// BullMQ Workers MUST have their own dedicated Redis connection — sharing with
// the Queue's connection causes blocking command conflicts that silently stall
// jobs after the first one completes.
function createWorkerConnection() {
  return new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

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
    {
      connection: createWorkerConnection() as unknown as ConnectionOptions,
      // Keep concurrency at 1 to avoid needing multiple blocking connections.
      // Email sending is I/O-bound and sequential is fine for typical volumes.
      concurrency: 1,
      lockDuration: 30_000,      // 30s lock — plenty for a single email send
      lockRenewTime: 10_000,     // renew every 10s
      stalledInterval: 15_000,   // check for stalled jobs every 15s
      maxStalledCount: 2,        // allow 2 stall retries before marking failed
    },
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

// Start the worker if this module is run directly (via tsx or node)
const isMain =
  process.argv[1]?.endsWith("emailWorker.ts") ||
  process.argv[1]?.endsWith("emailWorker.js");

if (isMain) {
  console.log("Starting stand-alone email worker process...");
  spawnEmailWorker();
  console.log("Email worker running. Press Ctrl+C to stop.");

  // Prevent silent crashes — log and keep the process alive on unhandled errors
  process.on("unhandledRejection", (reason) => {
    console.error("[EmailWorker] Unhandled promise rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[EmailWorker] Uncaught exception:", err);
  });
}
