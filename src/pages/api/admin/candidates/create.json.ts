import type { APIRoute } from "astro";
import { createCandidate } from "../../../../lib/services/candidates";
import { requireLocalUser } from "../../../../lib/permissions";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const user = requireLocalUser(locals);
  const body = await request.json();
  try {
    const candidate = await createCandidate(body, user.uid);
    return new Response(JSON.stringify(candidate), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating candidate:", error);
    const err = error as { code?: number; message?: string; details?: unknown };
    const status = err.code === 403 ? 403 : 500;
    return new Response(
      JSON.stringify({
        error: err.message || "Failed to create candidate",
        details: err.details,
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
