import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  try {
    const candidate = await import("../../../../lib/services/candidates").then(
      (m) => m.createCandidate(body),
    );
    return new Response(JSON.stringify(candidate), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating candidate:", error);
    const status = error.code === 403 ? 403 : 500;
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create candidate",
        details: error.details,
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
