import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { upsertCandidateSchema, type UpsertCandidateType } from "../lib/models/upsertCandidate";
import * as candidateService from "../lib/services/candidates";
import { getCurrentUserId } from "../lib/permissions";
import { handleActionError } from "./utils";

export const createCandidate = defineAction({
  accept: "json",
  input: upsertCandidateSchema,
  handler: async (input, context) => {
    const userId = await getCurrentUserId(context.cookies.get("__session")?.value);
    try {
      return await candidateService.createCandidate(input, userId);
    } catch (err) {
      handleActionError(err, "Failed to create candidate");
    }
  },
});

export const updateCandidate = defineAction({
  accept: "json",
  input: upsertCandidateSchema.extend({ id: z.string() }),
  handler: async (input, context) => {
    const { id, ...data } = input;
    const userId = await getCurrentUserId(context.cookies.get("__session")?.value);
    try {
      return await candidateService.updateCandidate(id, data, userId);
    } catch (err) {
      handleActionError(err, "Failed to update candidate");
    }
  },
});

export const partialUpdateCandidate = defineAction({
  accept: "json",
  input: upsertCandidateSchema.partial().extend({ id: z.string() }),
  handler: async (input, context) => {
    const { id, ...data } = input;
    const userId = await getCurrentUserId(context.cookies.get("__session")?.value);
    try {
      // Cast to Partial<UpsertCandidateType> to handle exactOptionalPropertyTypes if necessary
      return await candidateService.partialUpdateCandidate(id, data as Partial<UpsertCandidateType>, userId);
    } catch (err) {
      handleActionError(err, "Failed to update candidate");
    }
  },
});

export const deleteCandidate = defineAction({
  accept: "json",
  input: z.object({ id: z.string() }),
  handler: async (input, context) => {
    const userId = await getCurrentUserId(context.cookies.get("__session")?.value);
    try {
      return await candidateService.deleteCandidate(input.id, userId);
    } catch (err) {
      handleActionError(err, "Failed to delete candidate");
    }
  },
});

export const sendMassEmail = defineAction({
  accept: "json",
  input: z.object({
    subject: z.string().min(1, "Subject is required"),
    bodyTemplate: z.string().min(1, "Body template is required"),
    userGoogleAccountId: z.string().min(1, "Google account ID is required"),
    targets: z.array(z.object({
      id: z.string().optional(),
      email: z.string().email(),
      variables: z.record(z.string()).optional()
    })).min(1, "At least one target is required"),
    scheduledAt: z.string().optional()
  }),
  handler: async (input, context) => {
    const { emailQueue } = await import("../lib/jobs/emailQueue");
    
    // Validate permission 
    await getCurrentUserId(context.cookies.get("__session")?.value);

    // Calculate delay if scheduledAt is provided
    let delay = 0;
    if (input.scheduledAt) {
      const scheduledDate = new Date(input.scheduledAt);
      const now = new Date();
      delay = Math.max(0, scheduledDate.getTime() - now.getTime());
    }
    
    // Add jobs to queue
    const jobs = input.targets.map(target => {
      let personalizedBody = input.bodyTemplate;
      if (target.variables) {
        for (const [key, value] of Object.entries(target.variables)) {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
          personalizedBody = personalizedBody.replace(regex, value);
        }
      }

      return {
        name: 'send-email',
        data: {
          candidateId: target.id ?? null,
          emailAddress: target.email,
          subject: input.subject,
          body: personalizedBody,
          userGoogleAccountId: input.userGoogleAccountId
        },
        ...(delay > 0 && { opts: { delay } })
      };
    });

    try {
      await emailQueue.addBulk(jobs);
      return { success: true, count: jobs.length };
    } catch (err) {
      handleActionError(err, "Failed to enqueue email jobs");
    }
  }
});
