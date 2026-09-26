import type { APIRoute } from "astro";
import { updateRace } from "../../../../../lib/services/races";
import { requireLocalUser } from "../../../../../lib/permissions";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Race ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = requireLocalUser(locals);

    // delegate to service
    const body = await request.json();
    try {
      const race = await updateRace(id, body, user.uid);
      return new Response(JSON.stringify(race), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating race:", error);
      const err = error as {
        code?: number;
        message?: string;
        details?: unknown;
      };
      const status = err.code === 403 ? 403 : err.code === 404 ? 404 : 500;
      return new Response(
        JSON.stringify({
          error: err.message || "Failed to update race",
          details: err.details,
        }),
        { status, headers: { "Content-Type": "application/json" } },
      );
    }
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
