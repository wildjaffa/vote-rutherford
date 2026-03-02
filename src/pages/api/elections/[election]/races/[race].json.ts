import type { APIRoute } from "astro";
import prisma from "../../../../../lib/prisma";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { election: electionSlug, race: raceSlug } = params;

  if (!electionSlug || !raceSlug) {
    return new Response(null, { status: 404 });
  }

  const race = await prisma.race.findFirst({
    where: {
      slug: raceSlug,
      election: { slug: electionSlug },
    },
    include: { candidates: true },
  });

  if (!race) {
    return new Response(null, { status: 404 });
  }

  return new Response(JSON.stringify(race), {
    headers: { "Content-Type": "application/json" },
  });
};
