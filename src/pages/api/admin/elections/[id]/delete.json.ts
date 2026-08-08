import type { APIRoute } from "astro";
import { parse } from "cookie";
import { deleteElection } from "../../../../../lib/services/elections";
import { getSessionUser } from "../../../../../firebase/server";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Election ID required" }), {
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
      await deleteElection(id, user.uid);
      return new Response(
        JSON.stringify({ success: true, message: "Election deleted" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error deleting election:", error);
      const err = error as {
        code?: number;
        message?: string;
        details?: unknown;
      };
      const status = err.code === 403 ? 403 : err.code === 404 ? 404 : 500;
      return new Response(
        JSON.stringify({
          error: err.message || "Failed to delete election",
          details: err.details,
        }),
        { status, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("Error deleting election:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to delete election",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
