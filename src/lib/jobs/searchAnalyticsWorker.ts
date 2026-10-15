import "dotenv/config";
import { PgBoss } from "pg-boss";
import { syncConnectedSearchAnalytics } from "../services/searchAnalytics";

const QUEUE_NAME = "search-analytics-sync";
let boss: PgBoss | null = null;

async function startWorker(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not defined");

  boss = new PgBoss(connectionString);
  boss.on("error", (error) => {
    console.error("[SearchAnalyticsWorker] pg-boss error:", error);
  });
  await boss.start();
  await boss.createQueue(QUEUE_NAME);
  await boss.schedule(QUEUE_NAME, "15 8 * * *", {}, { tz: "America/Chicago" });
  await boss.work(QUEUE_NAME, { localConcurrency: 1 }, async () => {
    const updated = await syncConnectedSearchAnalytics();
    console.log(`[SearchAnalyticsWorker] Synced ${updated} provider/day rows.`);
  });
  console.log("[SearchAnalyticsWorker] Nightly sync scheduled for 8:15 AM Central.");
}

const isMain = process.argv[1]?.endsWith("searchAnalyticsWorker.ts");
if (isMain) {
  startWorker().catch((error) => {
    console.error("[SearchAnalyticsWorker] Failed to start:", error);
    process.exit(1);
  });

  const shutdown = async () => {
    if (boss) await boss.stop({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
