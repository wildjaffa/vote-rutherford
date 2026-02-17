import { z } from "astro/zod";
import type { CanValidate } from "./canValidate";

export const upsertCandidateSchema = z.object({
  id: z.string().optional(),
  raceId: z.string().optional(), // Optional for updates, required for create usually but handled by logic
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1, "Last name is required"),
  birthYear: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(1900).optional().nullable(),
  ),
  biography: z.string().optional().nullable(),
  biographyRedacted: z.string().optional().nullable(),
  profileImageId: z.string().optional().nullable(),
  slug: z.string().min(1, "Slug is required"),
  facebookUrl: z.string().optional().nullable(),
  xUrl: z.string().optional().nullable(),
  instagramUrl: z.string().optional().nullable(),
  linkedInUrl: z.string().optional().nullable(),
  youtubeUrl: z.string().optional().nullable(),
  threadsUrl: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
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
