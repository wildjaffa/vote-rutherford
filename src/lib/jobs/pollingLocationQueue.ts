import "dotenv/config";
import { PgBoss } from "pg-boss";

export const POLLING_LOCATION_QUEUE = "polling-location-calculation";

let boss: PgBoss | null = null;

async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not defined");

  boss = new PgBoss(connectionString);
  boss.on("error", (error) => {
    console.error("[PollingLocationQueue] pg-boss error:", error);
  });
  await boss.start();
  await boss.createQueue(POLLING_LOCATION_QUEUE);
  return boss;
}

export async function enqueuePollingLocationCalculation(): Promise<string> {
  const queue = await getBoss();
  const jobId = await queue.send(
    POLLING_LOCATION_QUEUE,
    {},
    {
      retryLimit: 2,
      retryDelay: 60,
      expireInSeconds: 60 * 60,
      deleteAfterSeconds: 7 * 24 * 60 * 60,
    },
  );

  if (!jobId) {
    throw new Error("Polling location calculation was not queued");
  }

  return jobId;
}
