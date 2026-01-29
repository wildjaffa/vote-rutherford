import type { APIRoute } from "astro";
import prisma from "../../../../../lib/prisma";
import { canManageRace } from "../../../../../lib/permissions";

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
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

    // Soft delete by setting deletedAt timestamp
    await prisma.race.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Race deleted" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error deleting race:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to delete race",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
