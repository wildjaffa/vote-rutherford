import type { APIRoute } from "astro";
import prisma, { withUserContext } from "../../../../../lib/prisma";
import { canManageElection } from "../../../../../lib/permissions";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Election ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check permissions
    const hasPermission = await canManageElection(id);
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify election exists
    const existingElection = await prisma.election.findUnique({
      where: { id },
    });

    if (!existingElection) {
      return new Response(JSON.stringify({ error: "Election not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { name, description, date, slug } = body;

    // Update election with user context for audit logging
    const election = await withUserContext(SYSTEM_USER_ID, async () => {
      return prisma.election.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(date && { date: new Date(date) }),
          ...(slug && { slug }),
          updatedAt: new Date(),
        },
      });
    });

    return new Response(JSON.stringify(election), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating election:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update election",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
