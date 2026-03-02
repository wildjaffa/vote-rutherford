import type { APIRoute } from "astro";
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  try {
    const election = await import("../../../../lib/services/elections").then(
      (m) => m.createElection(body),
    );
    return new Response(JSON.stringify(election), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating election:", error);
    const status = error.code === 403 ? 403 : 500;
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create election",
        details: error.details,
      }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  }
};
