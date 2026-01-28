import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import type { ElectionWithRacesAndCandidates } from "../../../lib/types";

export const getStaticPaths = async () => {
  const elections = await getCollection("elections");
  return elections.map((election) => ({
    params: { election: election.data.slug },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const { election: slug } = params;

  if (!slug) {
    return new Response(null, { status: 404 });
  }

  const elections = await getCollection("elections");
  const electionData = elections.find((e) => e.data.slug === slug);

  if (!electionData) {
    return new Response(null, { status: 404 });
  }

  return new Response(JSON.stringify(electionData.data), {
    headers: { "Content-Type": "application/json" },
  });
};

export type GetElectionResponse = ElectionWithRacesAndCandidates;
