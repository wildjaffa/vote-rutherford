import type { APIRoute } from "astro";
import { parse } from "cookie";
import { updateRace } from "../../../../../lib/services/races";
import { getSessionUser } from "../../../../../firebase/server";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Race ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cookies = parse(request.headers.get("cookie") || "");
    const sessionCookie = cookies["__session"];
    const user = await getSessionUser(sessionCookie);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // delegate to service
    const body = await request.json();
    try {
      const race = await updateRace(id, body, user.uid);
      return new Response(JSON.stringify(race), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating race:", error);
      const err = error as {
        code?: number;
        message?: string;
        details?: unknown;
      };
      const status = err.code === 403 ? 403 : err.code === 404 ? 404 : 500;
      return new Response(
        JSON.stringify({
          error: err.message || "Failed to update race",
          details: err.details,
        }),
        { status, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("Error updating race:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update race",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
