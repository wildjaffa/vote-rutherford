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
      const { candidateId, emailAddress, subject, body } = job.data;

      const provider = getEmailProvider();
      const success = await provider.sendEmail({
        to: emailAddress,
        subject,
        body,
        candidateId: candidateId ?? undefined,
      });

      if (!success) {
        throw new Error("Email sending failed");
      }

      // Record successful outreach in database
      await prisma.emailOutreach.create({
        data: {
          candidateId: candidateId || null,
          emailAddress,
          subject,
          body,
          sentAt: new Date(),
        },
      });

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
