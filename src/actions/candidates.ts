import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";

export const createCandidate = defineAction({
  accept: "json",
  input: z.object({
    raceId: z.string(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    birthYear: z.number().optional(),
    biography: z.string().optional(),
    profileImageId: z.string().optional(),
  }),
  handler: async (input, context) => {
    const url = new URL(
      "/api/admin/candidates/create.json",
      context.request.url,
    );
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.error || "Failed to create candidate",
      });
    }

    return await response.json();
  },
});

export const updateCandidate = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    birthYear: z.number().optional(),
    biography: z.string().optional(),
    profileImageId: z.string().optional(),
  }),
  handler: async (input, context) => {
    const { id, ...data } = input;
    const url = new URL(
      `/api/admin/candidates/${id}/update.json`,
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
        message: error.error || "Failed to update candidate",
      });
    }

    return await response.json();
  },
});

export const deleteCandidate = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
  }),
  handler: async (input, context) => {
    const url = new URL(
      `/api/admin/candidates/${input.id}/delete.json`,
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
        message: error.error || "Failed to delete candidate",
      });
    }

    return await response.json();
  },
});
