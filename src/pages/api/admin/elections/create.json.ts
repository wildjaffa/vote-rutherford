import type { APIRoute } from "astro";
import prisma from "../../../../lib/prisma";
import { canManageElections } from "../../../../lib/permissions";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check permissions
    const hasPermission = await canManageElections();
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { name, description, date, slug } = body;

    // Validate required fields
    if (!name || !description || !date || !slug) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: name, description, date, slug",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create election
    const election = await prisma.election.create({
      data: {
        name,
        description,
        date: new Date(date),
        slug,
      },
    });

    return new Response(JSON.stringify(election), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating election:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create election",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
