import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import "dotenv/config";

// Ensure connection to Redis works for both dev and prod cases
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export interface SendEmailJobData {
  candidateId?: string | null;
  emailAddress: string;
  subject: string;
  body: string;
  userGoogleAccountId?: string;
}

// Global queue instance
export const emailQueue = new Queue<SendEmailJobData>("email-outreach", { connection: connection as unknown as ConnectionOptions });
