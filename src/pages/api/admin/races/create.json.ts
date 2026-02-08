import type { APIRoute } from "astro";
import prisma, { withUserContext } from "../../../../lib/prisma";
import { canManageElection } from "../../../../lib/permissions";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, description, electionId, raceTypeId, status, districtId } =
      body;

    // Validate required fields
    if (!name || !description || !electionId || !raceTypeId || !status) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: name, description, electionId, raceTypeId, status",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check permissions
    const hasPermission = await canManageElection(electionId);
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify election exists
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      return new Response(JSON.stringify({ error: "Election not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create race with user context for audit logging
    const race = await withUserContext(SYSTEM_USER_ID, async () => {
      return prisma.race.create({
        data: {
          name,
          description,
          electionId,
          raceTypeId: parseInt(raceTypeId),
          status,
          ...(districtId && { districtId }),
        },
      });
    });

    return new Response(JSON.stringify(race), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating race:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create race",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
