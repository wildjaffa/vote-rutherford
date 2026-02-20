import type { APIRoute } from "astro";
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  try {
    const race = await import("../../../../lib/services/races").then((m) =>
      m.createRace(body),
    );
    return new Response(JSON.stringify(race), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating race:", error);
    const status = error.code === 403 ? 403 : error.code === 404 ? 404 : 500;
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create race",
        details: error.details,
      }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  }
};
