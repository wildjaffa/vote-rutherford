import type { APIRoute } from "astro";
import { parse } from "cookie";
import { deleteRace } from "../../../../../lib/services/races";
import { getSessionUser } from "../../../../../firebase/server";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, request }) => {
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

    try {
      await deleteRace(id, user.uid);
      return new Response(
        JSON.stringify({ success: true, message: "Race deleted" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error deleting race:", error);
      const err = error as {
        code?: number;
        message?: string;
        details?: unknown;
      };
      const status = err.code === 403 ? 403 : err.code === 404 ? 404 : 500;
      return new Response(
        JSON.stringify({
          error: err.message || "Failed to delete race",
          details: err.details,
        }),
        { status, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("Error deleting race:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to delete race",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
