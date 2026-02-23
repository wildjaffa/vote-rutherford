import { z } from "astro/zod";
import type { CanValidate } from "./canValidate";

export const upsertCandidateSchema = z.object({
  id: z.string().optional(),
  raceId: z.string().optional(), // Optional for updates, required for create usually but handled by logic
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1, "Last name is required"),
  partyAffiliation: z.string().min(1, "Party Affiliation is required"),
  birthYear: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(1900).optional().nullable(),
  ),
  profileImageId: z.string().optional().nullable(),
  slug: z.string().min(1, "Slug is required"),
  externalLinks: z
    .array(
      z.object({
        type: z.string(),
        url: z.string().url("Must be a valid URL"),
        displayText: z.string().optional().nullable(),
        id: z.string().optional(),
      }),
    )
    .optional(),
  policyResponses: z
    .array(
      z.object({
        id: z.string().optional(),
        questionId: z.string(),
        responseText: z.string(),
        clarifications: z
          .array(
            z.object({
              id: z.string().optional(),
              clarificationText: z
                .string()
                .min(1, "Clarification text is required"),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
  qualifications: z.array(
    z.object({
      type: z.string(),
      url: z.string().url().optional().nullable(),
      displayText: z.string().min(1, "Display text is required"),
      id: z.string().optional(),
    }),
  ),
});

export type UpsertCandidateType = z.infer<typeof upsertCandidateSchema>;

export class UpsertCandidate implements CanValidate<UpsertCandidateType> {
  validate(data: unknown) {
    const result = upsertCandidateSchema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, errors: result.error };
    }
  }
}
