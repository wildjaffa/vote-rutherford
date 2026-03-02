import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import * as electionService from "../lib/services/elections";
import { upsertElectionSchema } from "../lib/models/upsertElection";
import { getCurrentUserId } from "../lib/permissions";
import { handleActionError } from "./utils";

export const createElection = defineAction({
  accept: "json",
  input: upsertElectionSchema.omit({ id: true }),
  handler: async (input, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      const election = await electionService.createElection(input, userId);
      return { data: election };
    } catch (err) {
      handleActionError(err, "Failed to create election");
    }
  },
});

export const updateElection = defineAction({
  accept: "json",
  input: upsertElectionSchema.extend({ id: z.string() }),
  handler: async (input, context) => {
    const { id, ...data } = input;
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      const election = await electionService.updateElection(id, data, userId);
      return { data: election };
    } catch (err) {
      handleActionError(err, "Failed to update election");
    }
  },
});

export const deleteElection = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
  }),
  handler: async (input, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      const result = await electionService.deleteElection(input.id, userId);
      return { data: result };
    } catch (err) {
      handleActionError(err, "Failed to delete election");
    }
  },
});
