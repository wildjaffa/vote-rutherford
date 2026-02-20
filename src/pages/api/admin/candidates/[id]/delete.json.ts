import type { APIRoute } from "astro";

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Candidate ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await import("../../../../../lib/services/candidates").then((m) =>
      m.deleteCandidate(id),
    );
    return new Response(
      JSON.stringify({ success: true, message: "Candidate deleted" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Error deleting candidate:", error);
    const status = error.code === 403 ? 403 : 500;
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to delete candidate",
        details: error.details,
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
