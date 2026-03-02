import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { upsertCandidateSchema } from "../lib/models/upsertCandidate";
import * as candidateService from "../lib/services/candidates";
import { getCurrentUserId } from "../lib/permissions";
import { handleActionError } from "./utils";

export const createCandidate = defineAction({
  accept: "json",
  input: upsertCandidateSchema,
  handler: async (input, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      const candidate = await candidateService.createCandidate(input, userId);
      return { data: candidate };
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
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      const updated = await candidateService.updateCandidate(id, data, userId);
      return { data: updated };
    } catch (err) {
      handleActionError(err, "Failed to update candidate");
    }
  },
});

export const deleteCandidate = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
  }),
  handler: async (input, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      const deleted = await candidateService.deleteCandidate(input.id, userId);
      return { data: deleted };
    } catch (err) {
      handleActionError(err, "Failed to delete candidate");
    }
  },
});
