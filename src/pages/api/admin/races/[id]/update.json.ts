import type { APIRoute } from "astro";
import prisma from "../../../../../lib/prisma";
import { canManageRace } from "../../../../../lib/permissions";

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
    const { name, description, raceTypeId, status } = body;

    // Update race
    const race = await prisma.race.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(raceTypeId && { raceTypeId: parseInt(raceTypeId) }),
        ...(status && { status }),
        updatedAt: new Date(),
      },
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
