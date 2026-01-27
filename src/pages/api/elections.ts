import type { APIRoute } from "astro";
import prisma from "../../lib/prisma";
import type { ElectionWithRacesAndCandidates } from "../../lib/types";

export const GET: APIRoute = async () => {
  const elections = await prisma.election.findMany({
    include: { races: { include: { candidates: true } } },
  });

  return new Response(JSON.stringify(elections), {
    headers: { "Content-Type": "application/json" },
  });
};

export type GetElectionsResponse = ElectionWithRacesAndCandidates[];
