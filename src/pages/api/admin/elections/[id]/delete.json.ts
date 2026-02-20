import type { APIRoute } from "astro";
import { deleteElection } from "../../../../../lib/services/elections";

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

    try {
      await deleteElection(id);
      return new Response(
        JSON.stringify({ success: true, message: "Election deleted" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error: any) {
      console.error("Error deleting election:", error);
      const status = error.code === 403 ? 403 : error.code === 404 ? 404 : 500;
      return new Response(
        JSON.stringify({
          error: error.message || "Failed to delete election",
          details: error.details,
        }),
        { status, headers: { "Content-Type": "application/json" } },
      );
    }
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
