import type { APIRoute } from "astro";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Candidate ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // delegate to service layer, which already handles permission, validation, etc
    const body = await request.json();
    try {
      const candidate =
        await import("../../../../../lib/services/candidates").then((m) =>
          m.updateCandidate(id, body),
        );
      return new Response(JSON.stringify(candidate), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Error updating candidate:", error);
      const status = error.code === 403 ? 403 : error.code === 404 ? 404 : 500;
      return new Response(
        JSON.stringify({
          error: error.message || "Failed to update candidate",
          details: error.details,
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
