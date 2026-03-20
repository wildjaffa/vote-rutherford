import { z } from "astro/zod";

export const upsertContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("A valid email address is required"),
  description: z.string().optional(),
});

export type UpsertContactType = z.infer<typeof upsertContactSchema>;
