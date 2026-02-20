import { z } from "astro/zod";
import type { CanValidate } from "./canValidate";

export const upsertElectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Election name is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Election date is required"),
  slug: z.string().min(1, "Slug is required"),
  headerImage: z.string().optional().nullable(),
  policyQuestions: z
    .array(
      z.object({
        id: z.string().optional(),
        questionText: z.string().min(1, "Question text is required"),
        descriptionText: z.string().optional().nullable(),
        order: z.number().int().default(0),
      }),
    )
    .optional(),
});

export type UpsertElectionType = z.infer<typeof upsertElectionSchema>;

export class UpsertElection implements CanValidate<UpsertElectionType> {
  validate(data: unknown) {
    const result = upsertElectionSchema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, errors: result.error };
    }
  }
}
