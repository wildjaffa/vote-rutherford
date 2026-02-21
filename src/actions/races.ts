import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import * as raceService from "../lib/services/races";
import { upsertRaceSchema } from "../lib/models/upsertRace";

export const createRace = defineAction({
  accept: "json",
  input: upsertRaceSchema.omit({ id: true }),
  handler: async (input) => {
    try {
      const race = await raceService.createRace(input);
      return { data: race };
    } catch (err: any) {
      throw new ActionError({
        code: err.code === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
        message: err.message || "Failed to create race",
      });
    }
  },
});

export const updateRace = defineAction({
  accept: "json",
  input: upsertRaceSchema,
  handler: async (input) => {
    const { id, ...data } = input;
    try {
      const race = await raceService.updateRace(id!, data);
      return { data: race };
    } catch (err: any) {
      throw new ActionError({
        code: err.code === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
        message: err.message || "Failed to update race",
      });
    }
  },
});

export const deleteRace = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
  }),
  handler: async (input) => {
    try {
      const result = await raceService.deleteRace(input.id);
      return { data: result };
    } catch (err: any) {
      throw new ActionError({
        code: err.code === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
        message: err.message || "Failed to delete race",
      });
    }
  },
});
