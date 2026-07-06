import { PgBoss } from "pg-boss";
import "dotenv/config";

export const EMAIL_QUEUE_NAME = "email-outreach";

export interface SendEmailJobData {
  candidateId?: string | null;
  contactId?: string | null;
  emailAddress: string;
  subject: string;
  body: string;
  userGoogleAccountId?: string;
}

let _boss: PgBoss | null = null;

/**
 * Returns (and lazily creates) the shared pg-boss instance.
 * pg-boss stores jobs in the `pgboss` schema of the existing Postgres database —
 * no separate Redis service required. Multiple processes can share the same
 * DATABASE_URL; pg-boss coordinates via Postgres advisory locks.
 */
export async function getEmailBoss(): Promise<PgBoss> {
  if (_boss) return _boss;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not defined");

  _boss = new PgBoss(connectionString);
  await _boss.start();
  await _boss.createQueue(EMAIL_QUEUE_NAME);
  return _boss;
}

/**
 * Enqueue one or more email jobs. Pass `delayMs > 0` to schedule for the future.
 * Jobs are immediately visible in the `pgboss.job` table.
 */
export async function addEmailJobs(
  jobs: SendEmailJobData[],
  delayMs = 0,
): Promise<void> {
  const boss = await getEmailBoss();
  const startAfter = delayMs > 0 ? new Date(Date.now() + delayMs) : undefined;

  await boss.insert(
    EMAIL_QUEUE_NAME,
    jobs.map((data) => ({
      data,
      retryLimit: 3,         // retry up to 3 times on failure
      retryDelay: 30,        // wait 30 seconds between retries
      expireInSeconds: 300,  // abandon if taking longer than 5 minutes
      // Keep completed/failed records for 14 days for visibility
      deleteAfterSeconds: 14 * 24 * 60 * 60,
      ...(startAfter ? { startAfter } : {}),
    })),
  );
}
