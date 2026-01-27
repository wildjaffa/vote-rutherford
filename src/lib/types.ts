import type { Prisma } from "../../src/generated/prisma/client";

/**
 * Type-safe Prisma query result types that include relations
 * These ensure the frontend has proper types for data fetched with `include`
 */

// Election with all races and their candidates
export type ElectionWithRacesAndCandidates = Prisma.ElectionGetPayload<{
  include: { races: { include: { candidates: true } } };
}>;

// Single race with candidates
export type RaceWithCandidates = Prisma.RaceGetPayload<{
  include: { candidates: true };
}>;

// Re-export for convenience
export type { Race, Candidate } from "../../src/generated/prisma/client";
