import type { APIRoute } from "astro";
import prisma from "../../../lib/prisma";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { election: slug } = params;

  if (!slug) {
    return new Response(null, { status: 404 });
  }

  const election = await prisma.election.findUnique({
    where: { slug },
    include: {
      races: true,
    },
  });
  if (!election) {
    return new Response(null, { status: 404 });
  }

  return new Response(JSON.stringify(election), {
    headers: { "Content-Type": "application/json" },
  });
};
