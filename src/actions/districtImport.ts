import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { runDistrictImport, type ImportProgress } from "../lib/districtImport";
import prisma from "../lib/prisma";
import { canManageDistricts, getCurrentUserId } from "../lib/permissions";

export const startDistrictImport = defineAction({
  input: z.object({
    csvContent: z.string(),
    geoJsonFiles: z.record(z.string()),
  }),
  handler: async ({ csvContent, geoJsonFiles }, context) => {
    if (!canManageDistricts()) {
      throw new Error("Insufficient permissions");
    }
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      const result = await runDistrictImport(
        csvContent,
        geoJsonFiles,
        userId,
        (progress: ImportProgress) => {
          // In a real implementation, this could emit to WebSocket
          // For now, we'll just log it
          console.log(
            `Import progress: ${progress.stage} - ${progress.message}`,
          );
        },
      );

      return result;
    } catch (error) {
      console.error("District import failed:", error);
      throw new Error(
        "Import failed: " +
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
    if (!canManageDistricts()) {
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
