import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";

export const createRace = defineAction({
  accept: "json",
  input: z.object({
    electionId: z.string(),
    name: z.string().min(1, "Race name is required"),
    raceTypeId: z.number().min(0, "Race type is required"),
    description: z.string().optional(),
    status: z.string().min(1, "Status is required"),
    slug: z.string().min(1, "Slug is required"),
    districtId: z.string().optional(),
  }),
  handler: async (input, context) => {
    const url = new URL("/api/admin/races/create.json", context.request.url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.error || "Failed to create race",
      });
    }

    return await response.json();
  },
});

export const updateRace = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
    name: z.string().optional(),
    raceType: z.number().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    slug: z.string().optional(),
    districtId: z.string().optional(),
  }),
  handler: async (input, context) => {
    const { id, ...data } = input;
    const url = new URL(
      `/api/admin/races/${id}/update.json`,
      context.request.url,
    );
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.error || "Failed to update race",
      });
    }

    return await response.json();
  },
});

export const deleteRace = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
  }),
  handler: async (input, context) => {
    const url = new URL(
      `/api/admin/races/${input.id}/delete.json`,
      context.request.url,
    );
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.error || "Failed to delete race",
      });
    }

    return await response.json();
  },
});
