import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import type { Candidate } from "../../../../../../../generated/prisma/client";

export const getStaticPaths = async () => {
  const candidates = await getCollection("candidates");
  return candidates.map((candidate) => ({
    params: {
      election: candidate.data.race.election.slug,
      race: candidate.data.race.slug,
      candidate: candidate.data.slug,
    },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const { election, race, candidate: candidateSlug } = params;

  if (!election || !race || !candidateSlug) {
    return new Response(null, { status: 404 });
  }

  const candidates = await getCollection("candidates");
  const candidate = candidates.find(
    (c) =>
      c.data.slug === candidateSlug &&
      c.data.race.slug === race &&
      c.data.race.election.slug === election,
  );

  if (!candidate) {
    return new Response(null, { status: 404 });
  }

  return new Response(JSON.stringify(candidate.data), {
    headers: { "Content-Type": "application/json" },
  });
};

export type GetCandidateResponse = Candidate;
