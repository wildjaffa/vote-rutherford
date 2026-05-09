import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { districtImportQueue } from "../lib/jobs/districtImportQueue.ts";
import prisma from "../lib/prisma";
import { canManageDistricts, getCurrentUserId } from "../lib/permissions";
import { ImportJobStatus } from "../generated/prisma/enums";

export const startDistrictImport = defineAction({
  input: z.object({
    csvContent: z.string(),
    geoJsonFiles: z.record(z.string()),
    entireCountyTypes: z.array(z.string()).default([]),
  }),
  handler: async ({ csvContent, geoJsonFiles, entireCountyTypes }, context) => {
    if (!(await canManageDistricts())) {
      throw new Error("Insufficient permissions");
    }

    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );

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
        },
        {
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
  handler: async ({ jobId }) => {
    if (!(await canManageDistricts())) {
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
