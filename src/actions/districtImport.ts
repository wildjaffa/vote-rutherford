import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { districtImportQueue } from "../lib/jobs/districtImportQueue.ts";
import prisma from "../lib/prisma";
import { canManageDistricts, getCurrentUserId } from "../lib/permissions";
import { ImportJobStatus } from "../generated/prisma/enums";
import type { DistrictMapping } from "../lib/types/districtImport";

export const startDistrictImport = defineAction({
  input: z.object({
    csvContent: z.string(),
    geoJsonFiles: z.record(z.string()),
    entireCountyTypes: z.array(z.string()).default([]),
  }),
  handler: async ({ csvContent, geoJsonFiles, entireCountyTypes }, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );

    if (!(await canManageDistricts(userId))) {
      throw new Error("Insufficient permissions");
    }

    const job = await prisma.districtImportJob.create({
      data: {
        status: ImportJobStatus.PENDING,
        createdBy: userId,
        progress: {
          stage: "pending",
          processed: 0,
          message: "Waiting for import worker",
        },
      },
    });

    try {
      await districtImportQueue.add(
        "district-import",
        {
          jobId: job.id,
          csvContent,
          geoJsonFiles,
          entireCountyTypes,
          userId,
          mode: "analyze",
        },
        {
          jobId: job.id,
          removeOnComplete: 100,
          removeOnFail: 100,
          attempts: 3,
        },
      );

      return { success: true, jobId: job.id };
    } catch (error) {
      await prisma.districtImportJob.update({
        where: { id: job.id },
        data: {
          status: ImportJobStatus.FAILED,
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      console.error("Failed to enqueue district import job:", error);
      throw new Error(
        "Failed to start background import: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  },
});

export const getDistrictImportStatus = defineAction({
  input: z.object({
    jobId: z.string(),
  }),
  handler: async ({ jobId }, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );

    if (!(await canManageDistricts(userId))) {
      throw new Error("Insufficient permissions");
    }

    const job = await prisma.districtImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error("Import job not found");
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      districtMapping: job.districtMapping,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    };
  },
});

export const confirmDistrictImport = defineAction({
  input: z.object({
    jobId: z.string(),
    confirmedMappings: z.custom<DistrictMapping>().array(),
  }),
  handler: async ({ jobId, confirmedMappings }, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );

    if (!(await canManageDistricts(userId))) {
      throw new Error("Insufficient permissions");
    }

    const job = await prisma.districtImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error("Import job not found");
    }

    if (job.status !== ImportJobStatus.AWAITING_MAPPING) {
      throw new Error("Job is not awaiting mapping");
    }

    const { districtImportQueue } =
      await import("../lib/jobs/districtImportQueue.ts");
    const oldJob = await districtImportQueue.getJob(jobId);

    if (!oldJob) {
      throw new Error(
        "Original file upload expired. Please upload files again.",
      );
    }

    await districtImportQueue.add(
      "district-import",
      {
        ...oldJob.data,
        mode: "execute",
        confirmedMappings,
      },
      {
        jobId: `${job.id}-execute`,
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 3,
      },
    );

    return { success: true, jobId: job.id };
  },
});
