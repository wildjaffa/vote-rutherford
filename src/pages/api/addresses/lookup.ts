import type { APIRoute } from "astro";
import { searchAddresses } from "../../../lib/addressLookup";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(100, Number(limitParam)) : 10;

  if (!q.trim()) {
    return new Response(JSON.stringify({ error: "q parameter required" }), {
      status: 400,
    });
  }

  try {
    const results = await searchAddresses(q, limit);
    return new Response(JSON.stringify({ results }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
};
