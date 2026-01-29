import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";

export const createElection = defineAction({
  accept: "json",
  input: z.object({
    name: z.string().min(1, "Election name is required"),
    description: z.string().min(1, "Description is required"),
    date: z.string().min(1, "Election date is required"),
    slug: z.string().min(1, "Slug is required"),
    headerImage: z.string().optional(),
  }),
  handler: async (input, context) => {
    const url = new URL(
      "/api/admin/elections/create.json",
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
        message: error.error || "Failed to create election",
      });
    }

    return await response.json();
  },
});

export const updateElection = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    date: z.string().optional(),
    slug: z.string().optional(),
    headerImage: z.string().optional(),
  }),
  handler: async (input, context) => {
    const { id, ...data } = input;
    const url = new URL(
      `/api/admin/elections/${id}/update.json`,
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
        message: error.error || "Failed to update election",
      });
    }

    return await response.json();
  },
});

export const deleteElection = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
  }),
  handler: async (input, context) => {
    const url = new URL(
      `/api/admin/elections/${input.id}/delete.json`,
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
        message: error.error || "Failed to delete election",
      });
    }

    return await response.json();
  },
});
