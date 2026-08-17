import type { APIRoute } from "astro";
import { deleteCandidate } from "../../../../../lib/services/candidates";
import { requireLocalUser } from "../../../../../lib/permissions";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Candidate ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = requireLocalUser(locals);

  try {
    await deleteCandidate(id, user.uid);
    return new Response(
      JSON.stringify({ success: true, message: "Candidate deleted" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error deleting candidate:", error);
    const err = error as { code?: number; message?: string; details?: unknown };
    const status = err.code === 403 ? 403 : 500;
    return new Response(
      JSON.stringify({
        error: err.message || "Failed to delete candidate",
        details: err.details,
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
