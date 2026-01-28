import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import type { ElectionWithRacesAndCandidates } from "../../lib/types";

export const GET: APIRoute = async () => {
  const elections = await getCollection("elections");
  const data = elections.map((e) => e.data);

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
};

export type GetElectionsResponse = ElectionWithRacesAndCandidates[];
