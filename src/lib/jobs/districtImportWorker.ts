import { Worker, type Job, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { Prisma } from "../../generated/prisma/client";
import prisma from "../prisma";
import { executeDistrictImport } from "../districtImport";
import { ImportJobStatus } from "../../generated/prisma/enums";
import type { DistrictImportJobData } from "./districtImportQueue";
import "dotenv/config";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

export const spawnDistrictImportWorker = () => {
  const worker = new Worker<DistrictImportJobData>(
    "district-import",
    async (job: Job<DistrictImportJobData>) => {
      const { jobId, csvContent, geoJsonFiles, entireCountyTypes } = job.data;

      await prisma.districtImportJob.update({
        where: { id: jobId },
        data: {
          status: ImportJobStatus.RUNNING,
          startedAt: new Date(),
          progress: {
            stage: "initializing",
            processed: 0,
            message: "Starting import",
          },
        },
      });

      const result = await executeDistrictImport(
        jobId,
        csvContent,
        geoJsonFiles,
        entireCountyTypes,
        async (progress) => {
          await prisma.districtImportJob.update({
            where: { id: jobId },
            data: {
              progress: progress as unknown as Prisma.InputJsonValue,
            },
          });
        },
      );

      if (!result.success) {
        throw new Error(result.error || "Import failed");
      }

      return result;
    },
    {
      connection: connection as unknown as ConnectionOptions,
      concurrency: 1,
      lockDuration: 120 * 60 * 1000, // 120 minutes for long-running imports
      maxStalledCount: 2,
      stalledInterval: 15 * 1000,
      lockRenewTime: 15 * 1000,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[DistrictImportWorker] Job ${job.id} completed.`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[DistrictImportWorker] Job ${job?.id} failed: ${err?.message}`,
    );
  });

  return worker;
};

const isMain = process.argv[1]?.endsWith("districtImportWorker.ts");
if (isMain) {
  console.log("Starting stand-alone district import worker...");
  spawnDistrictImportWorker();
  console.log("District import worker running. Press Ctrl+C to stop.");
}
