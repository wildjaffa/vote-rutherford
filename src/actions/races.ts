import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import * as raceService from "../lib/services/races";
import { upsertRaceSchema } from "../lib/models/upsertRace";
import { getCurrentUserId } from "../lib/permissions";
import { handleActionError } from "./utils";

export const createRace = defineAction({
  accept: "json",
  input: upsertRaceSchema.omit({ id: true }),
  handler: async (input, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      const race = await raceService.createRace(input, userId);
      return { data: race };
    } catch (err) {
      handleActionError(err, "Failed to create race");
    }
  },
});

export const updateRace = defineAction({
  accept: "json",
  input: upsertRaceSchema.extend({ id: z.string() }),
  handler: async (input, context) => {
    const { id, ...data } = input;
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      const race = await raceService.updateRace(id, data, userId);
      return { data: race };
    } catch (err) {
      handleActionError(err, "Failed to update race");
    }
  },
});

export const deleteRace = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
  }),
  handler: async (input, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      const result = await raceService.deleteRace(input.id, userId);
      return { data: result };
    } catch (err) {
      handleActionError(err, "Failed to delete race");
    }
  },
});
