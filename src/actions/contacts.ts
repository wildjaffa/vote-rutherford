import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { upsertContactSchema } from "../lib/models/upsertContact";
import * as contactService from "../lib/services/contacts";
import { getCurrentUserId } from "../lib/permissions";
import { handleActionError } from "./utils";

export const createContact = defineAction({
  accept: "json",
  input: upsertContactSchema,
  handler: async (input, context) => {
    const userId = await getCurrentUserId(context.cookies.get("__session")?.value);
    try {
      return await contactService.createContact(input, userId);
    } catch (err) {
      handleActionError(err, "Failed to create contact");
    }
  },
});

export const updateContact = defineAction({
  accept: "json",
  input: upsertContactSchema.extend({ id: z.string() }),
  handler: async (input, context) => {
    const { id, ...data } = input;
    const userId = await getCurrentUserId(context.cookies.get("__session")?.value);
    try {
      return await contactService.updateContact(id, data, userId);
    } catch (err) {
      handleActionError(err, "Failed to update contact");
    }
  },
});

export const deleteContact = defineAction({
  accept: "json",
  input: z.object({ id: z.string() }),
  handler: async (input, context) => {
    const userId = await getCurrentUserId(context.cookies.get("__session")?.value);
    try {
      return await contactService.deleteContact(input.id, userId);
    } catch (err) {
      handleActionError(err, "Failed to delete contact");
    }
  },
});
