import type { APIRoute } from "astro";
import prisma, { withUserContext } from "../../../../../lib/prisma";
import { canManageElection } from "../../../../../lib/permissions";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
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

    // Soft delete by setting deletedAt timestamp with user context for audit logging
    await withUserContext(SYSTEM_USER_ID, async () => {
      return prisma.election.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    });

    return new Response(
      JSON.stringify({ success: true, message: "Election deleted" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error deleting election:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to delete election",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
