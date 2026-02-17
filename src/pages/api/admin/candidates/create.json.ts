import type { APIRoute } from "astro";
import prisma, { withUserContext } from "../../../../lib/prisma";
import { canManageRace } from "../../../../lib/permissions";
import { UpsertCandidate } from "../../../../lib/models/upsertCandidate";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const validator = new UpsertCandidate();
    const validation = validator.validate(body);

    if (!validation.success || !validation.data) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validation.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const {
      firstName,
      middleName,
      lastName,
      raceId,
      birthYear,
      biography,
      biographyRedacted,
      profileImageId,
    } = validation.data;

    // Validate required fields explicitly if needed, though schema handles most
    if (!raceId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: raceId",
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

    // Create candidate with user context for audit logging
    const candidate = await withUserContext(SYSTEM_USER_ID, async () => {
      // If a profileImageId was provided, verify it exists
      if (profileImageId) {
        const blob = await prisma.blobStorageReference.findUnique({
          where: { id: profileImageId },
        });
        if (!blob) {
          throw new Error("profileImageId not found");
        }
      }

      return prisma.candidate.create({
        data: {
          firstName,
          middleName: middleName || null,
          lastName,
          raceId,
          birthYear: birthYear || null,
          biography: biography || null, // null is valid
          biographyRedacted: biographyRedacted || null,
          ...(profileImageId && { profileImageId }),
        },
      });
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
