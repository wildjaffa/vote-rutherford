import type { APIRoute } from "astro";
import { parse } from "cookie";
import { updateCandidate } from "../../../../../lib/services/candidates";
import { getSessionUser } from "../../../../../firebase/server";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Candidate ID required" }), {
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

    // delegate to service layer, which already handles permission, validation, etc
    const body = await request.json();
    try {
      const candidate = await updateCandidate(id, body, user.uid);
      return new Response(JSON.stringify(candidate), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating candidate:", error);
      const err = error as {
        code?: number;
        message?: string;
        details?: unknown;
      };
      const status = err.code === 403 ? 403 : err.code === 404 ? 404 : 500;
      return new Response(
        JSON.stringify({
          error: err.message || "Failed to update candidate",
          details: err.details,
        }),
        {
          status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Error updating candidate:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update candidate",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
