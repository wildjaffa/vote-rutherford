import type { APIRoute } from "astro";
import prisma, { withUserContext } from "../../../../../lib/prisma";
import { canManageRace } from "../../../../../lib/permissions";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Race ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check permissions
    const hasPermission = await canManageRace(id);
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify race exists
    const existingRace = await prisma.race.findUnique({
      where: { id },
    });

    if (!existingRace) {
      return new Response(JSON.stringify({ error: "Race not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { name, description, raceTypeId, status, districtId } = body;

    // Debug: inspect prisma instance before update
    try {
      console.log(
        "update.json.ts prisma keys",
        Object.keys(prisma).slice(0, 20),
      );
      console.log("prisma.race exists?", typeof prisma.race);
    } catch (e) {
      console.error("Error inspecting prisma instance:", e);
      /* ignore */
    }

    // Update race with user context for audit logging
    const race = await withUserContext(SYSTEM_USER_ID, async () => {
      // Debug: mark entering operation
      try {
        console.log("about to call prisma.race.update for id", id);
      } catch (e) {
        console.error("Error before prisma update:", e);
        /* ignore */
      }

      return prisma.race.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(raceTypeId && { raceTypeId: parseInt(raceTypeId) }),
          ...(status && { status }),
          ...(districtId && { districtId }),
          updatedAt: new Date(),
        },
      });
    });

    return new Response(JSON.stringify(race), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating race:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update race",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
