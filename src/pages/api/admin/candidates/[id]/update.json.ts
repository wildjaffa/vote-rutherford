import type { APIRoute } from "astro";
import { updateCandidate } from "../../../../../lib/services/candidates";
import { requireLocalUser } from "../../../../../lib/permissions";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Candidate ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = requireLocalUser(locals);

    // delegate to service layer, which already handles permission, validation, etc
    const body = await request.json();
    try {
      const candidate = await updateCandidate(id, body, user.uid);
      return new Response(JSON.stringify(candidate), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating candidate:", error);
      const err = error as {
        code?: number;
        message?: string;
        details?: unknown;
      };
      const status = err.code === 403 ? 403 : err.code === 404 ? 404 : 500;
      return new Response(
        JSON.stringify({
          error: err.message || "Failed to update candidate",
          details: err.details,
        }),
        {
          status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Error updating candidate:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update candidate",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
