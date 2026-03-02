import type { APIRoute } from "astro";
import { updateRace } from "../../../../../lib/services/races";

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

    // delegate to service
    const body = await request.json();
    try {
      const race = await updateRace(id, body);
      return new Response(JSON.stringify(race), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Error updating race:", error);
      const status = error.code === 403 ? 403 : error.code === 404 ? 404 : 500;
      return new Response(
        JSON.stringify({
          error: error.message || "Failed to update race",
          details: error.details,
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
