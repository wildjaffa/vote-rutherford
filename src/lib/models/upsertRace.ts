import { z } from "astro/zod";
import type { CanValidate } from "./canValidate";

export const upsertRaceSchema = z.object({
  id: z.string().optional(),
  electionId: z.string().optional(), // required on create but validated in service
  name: z.string().min(1, "Race name is required"),
  raceTypeId: z.number().min(0, "Race type is required"),
  description: z.string().optional().nullable(),
  status: z.string().min(1, "Status is required"),
  slug: z.string().min(1, "Slug is required"),
  districtId: z.string().optional().nullable(),
  numSelections: z.number().int().min(1).default(1),
  partyCategory: z.string().optional().default("General Election"),
  policyQuestionIds: z.array(z.string()).optional(),
});

export type UpsertRaceType = z.infer<typeof upsertRaceSchema>;

export class UpsertRace implements CanValidate<UpsertRaceType> {
  validate(data: unknown) {
    const result = upsertRaceSchema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, errors: result.error };
    }
  }
}
