import type { APIRoute } from "astro";
import type { Candidate } from "../../../../../../../generated/prisma/client";
import prisma from "../../../../../../../lib/prisma";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { election, race, candidate: candidateSlug } = params;

  if (!election || !race || !candidateSlug) {
    return new Response(null, { status: 404 });
  }

  const candidate = await prisma.candidate.findFirst({
    where: {
      slug: candidateSlug,
      race: {
        slug: race,
        election: {
          slug: election,
        },
      },
    },
  });

  if (!candidate) {
    return new Response(null, { status: 404 });
  }

  return new Response(JSON.stringify(candidate), {
    headers: { "Content-Type": "application/json" },
  });
};

export type GetCandidateResponse = Candidate;
