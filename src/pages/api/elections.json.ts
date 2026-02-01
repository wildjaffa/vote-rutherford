import type { APIRoute } from "astro";
import type { ElectionWithRacesAndCandidates } from "../../lib/types";
import prisma from "../../lib/prisma";

export const GET: APIRoute = async () => {
  const elections = await prisma.election.findMany({
    orderBy: { date: "desc" },
  });

  return new Response(JSON.stringify(elections), {
    headers: { "Content-Type": "application/json" },
  });
};

export type GetElectionsResponse = ElectionWithRacesAndCandidates[];
