import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { upsertCandidateSchema } from "../lib/models/upsertCandidate";
import * as candidateService from "../lib/services/candidates";

export const createCandidate = defineAction({
  accept: "json",
  input: upsertCandidateSchema,
  handler: async (input) => {
    try {
      const candidate = await candidateService.createCandidate(input);
      return { data: candidate };
    } catch (err: any) {
      throw new ActionError({
        code: err.code === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
        message: err.message || "Failed to create candidate",
      });
    }
  },
});

export const updateCandidate = defineAction({
  accept: "json",
  input: upsertCandidateSchema.extend({ id: z.string() }),
  handler: async (input) => {
    const { id, ...data } = input;
    try {
      const updated = await candidateService.updateCandidate(id, data);
      return { data: updated };
    } catch (err: any) {
      throw new ActionError({
        code: err.code === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
        message: err.message || "Failed to update candidate",
      });
    }
  },
});

export const deleteCandidate = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
  }),
  handler: async (input) => {
    try {
      const deleted = await candidateService.deleteCandidate(input.id);
      return { data: deleted };
    } catch (err: any) {
      throw new ActionError({
        code: err.code === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
        message: err.message || "Failed to delete candidate",
      });
    }
  },
});
