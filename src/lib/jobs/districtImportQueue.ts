import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import "dotenv/config";
import type { DistrictImportJobData } from "../types/districtImport";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

export const districtImportQueue = new Queue<DistrictImportJobData>(
  "district-import",
  { connection: connection as unknown as ConnectionOptions },
);
