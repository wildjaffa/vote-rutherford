import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import * as electionService from "../lib/services/elections";
import { upsertElectionSchema } from "../lib/models/upsertElection";

export const createElection = defineAction({
  accept: "json",
  input: upsertElectionSchema.omit({ id: true }),
  handler: async (input) => {
    try {
      const election = await electionService.createElection(input);
      return { data: election };
    } catch (err: any) {
      throw new ActionError({
        code: err.code === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
        message: err.message || "Failed to create election",
      });
    }
  },
});

export const updateElection = defineAction({
  accept: "json",
  input: upsertElectionSchema,
  handler: async (input) => {
    const { id, ...data } = input;
    try {
      const election = await electionService.updateElection(id, data);
      return { data: election };
    } catch (err: any) {
      throw new ActionError({
        code: err.code === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
        message: err.message || "Failed to update election",
      });
    }
  },
});

export const deleteElection = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
  }),
  handler: async (input) => {
    try {
      const result = await electionService.deleteElection(input.id);
      return { data: result };
    } catch (err: any) {
      throw new ActionError({
        code: err.code === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
        message: err.message || "Failed to delete election",
      });
    }
  },
});
