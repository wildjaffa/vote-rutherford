import type { APIRoute } from "astro";
import prisma from "../../lib/prisma";

export const GET: APIRoute = async () => {
  const elections = await prisma.election.findMany({});

  return new Response(JSON.stringify(elections), {
    headers: { "Content-Type": "application/json" },
  });
};
