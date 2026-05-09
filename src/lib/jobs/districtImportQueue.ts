import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import "dotenv/config";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

export interface DistrictImportJobData {
  jobId: string;
  csvContent: string;
  geoJsonFiles: Record<string, string>;
  entireCountyTypes: string[];
  userId: string;
}

export const districtImportQueue = new Queue<DistrictImportJobData>(
  "district-import",
  { connection: connection as unknown as ConnectionOptions },
);
