import type { APIRoute } from "astro";
import prisma from "../../../../lib/prisma";
import { canManageRace } from "../../../../lib/permissions";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      firstName,
      middleName,
      lastName,
      raceId,
      birthYear,
      biography,
      biographyRedacted,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !raceId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: firstName, lastName, raceId",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check permissions
    const hasPermission = await canManageRace(raceId);
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify race exists
    const race = await prisma.race.findUnique({
      where: { id: raceId },
    });

    if (!race) {
      return new Response(JSON.stringify({ error: "Race not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create candidate
    const candidate = await prisma.candidate.create({
      data: {
        firstName,
        middleName: middleName || null,
        lastName,
        raceId,
        birthYear: birthYear ? parseInt(birthYear) : null,
        biography: biography || null,
        biographyRedacted: biographyRedacted || null,
      },
    });

    return new Response(JSON.stringify(candidate), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating candidate:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create candidate",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
