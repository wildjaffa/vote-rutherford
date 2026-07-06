import { getEmailBoss, EMAIL_QUEUE_NAME } from "./emailQueue";
import type { SendEmailJobData } from "./emailQueue";
import { getEmailProvider } from "../services/email/EmailFactory";
import prisma from "../prisma";
import "dotenv/config";
import type { Job } from "pg-boss";

async function processEmailJob(job: Job<SendEmailJobData>): Promise<void> {
  const {
    candidateId,
    contactId,
    emailAddress,
    subject,
    body,
    userGoogleAccountId,
  } = job.data;

  console.log(`[EmailWorker] Processing job ${job.id} → ${emailAddress}`);

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

  // Record outreach attempt in database regardless of outcome.
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
    // Throwing causes pg-boss to mark this job as failed and schedule
    // a retry (up to retryLimit times, configured when the job was inserted).
    throw new Error(errorMessage || "Email sending failed");
  }

  console.log(`[EmailWorker] ✓ Job ${job.id} complete → ${emailAddress}`);
}

export async function spawnEmailWorker(): Promise<void> {
  const boss = await getEmailBoss();

  // pg-boss work() handler receives an array of jobs (batch).
  // With batchSize: 1 (default), each invocation gets exactly one job.
  await boss.work<SendEmailJobData>(
    EMAIL_QUEUE_NAME,
    {
      // Process one job at a time — safe for rate-limited email providers.
      // batchSize defaults to 1, so the handler receives a single-element array.
      localConcurrency: 1,
      // Poll every 2 seconds so large batches drain without waiting on idle timeout.
      pollingIntervalSeconds: 2,
    },
    async (jobs: Job<SendEmailJobData>[]) => {
      // With batchSize: 1 (default), this array always has exactly one element.
      for (const job of jobs) {
        await processEmailJob(job);
      }
    },
  );

  console.log(
    `[EmailWorker] Worker registered — polling queue: ${EMAIL_QUEUE_NAME}`,
  );
}

// Start the worker if this module is run directly (via tsx or node)
const isMain =
  process.argv[1]?.endsWith("emailWorker.ts") ||
  process.argv[1]?.endsWith("emailWorker.js");

if (isMain) {
  console.log("Starting stand-alone email worker process...");

  spawnEmailWorker()
    .then(() => {
      console.log("Email worker running. Press Ctrl+C to stop.");
    })
    .catch((err) => {
      console.error("[EmailWorker] Failed to start:", err);
      process.exit(1);
    });

  // Prevent silent crashes — log and keep the process alive on unhandled errors
  process.on("unhandledRejection", (reason) => {
    console.error("[EmailWorker] Unhandled promise rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[EmailWorker] Uncaught exception:", err);
  });

  // Graceful shutdown: let in-progress jobs finish before exiting
  const shutdown = async (signal: string) => {
    console.log(
      `[EmailWorker] ${signal} received — shutting down gracefully...`,
    );
    try {
      const boss = await getEmailBoss();
      await boss.stop({ graceful: true, timeout: 30_000 });
      console.log("[EmailWorker] Shutdown complete.");
    } catch (err) {
      console.error("[EmailWorker] Error during shutdown:", err);
    }
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
