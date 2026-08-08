import type { APIRoute } from "astro";
import { parse } from "cookie";
import { createRace } from "../../../../lib/services/races";
import { getSessionUser } from "../../../../firebase/server";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const cookies = parse(request.headers.get("cookie") || "");
  const sessionCookie = cookies["__session"];
  const user = await getSessionUser(sessionCookie);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  try {
    const race = await createRace(body, user.uid);
    return new Response(JSON.stringify(race), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating race:", error);
    const err = error as { code?: number; message?: string; details?: unknown };
    const status = err.code === 403 ? 403 : err.code === 404 ? 404 : 500;
    return new Response(
      JSON.stringify({
        error: err.message || "Failed to create race",
        details: err.details,
      }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  }
};
