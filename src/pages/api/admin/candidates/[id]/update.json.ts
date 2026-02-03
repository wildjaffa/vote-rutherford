import type { APIRoute } from "astro";
import prisma, { withUserContext } from "../../../../../lib/prisma";
import { canManageCandidate } from "../../../../../lib/permissions";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

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

    // Check permissions
    const hasPermission = await canManageCandidate(id);
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify candidate exists
    const existingCandidate = await prisma.candidate.findUnique({
      where: { id },
    });

    if (!existingCandidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const {
      firstName,
      middleName,
      lastName,
      birthYear,
      biography,
      biographyRedacted,
      profileImageId,
    } = body;

    // Update candidate with user context for audit logging
    const candidate = await withUserContext(SYSTEM_USER_ID, async () => {
      // Handle profile image change (optional)
      if (profileImageId !== undefined) {
        if (profileImageId) {
          const blob = await prisma.blobStorageReference.findUnique({
            where: { id: profileImageId },
          });
          if (!blob) throw new Error("profileImageId not found");
        }

        // If replacing an existing image, soft-delete the old blob and attempt to delete the object
        if (
          existingCandidate.profileImageId &&
          existingCandidate.profileImageId !== profileImageId
        ) {
          const oldBlob = await prisma.blobStorageReference.findUnique({
            where: { id: existingCandidate.profileImageId },
          });
          if (oldBlob && !oldBlob.deletedAt) {
            await prisma.blobStorageReference.update({
              where: { id: oldBlob.id },
              data: { deletedAt: new Date() },
            });
            try {
              const { deleteObject } =
                await import("../../../../../lib/blobStorage");
              await deleteObject(oldBlob.fileLocation);
            } catch (err) {
              // best-effort delete, do not block update
              console.error("Failed to delete old blob object:", err);
            }
          }
        }

        return prisma.candidate.update({
          where: { id },
          data: {
            ...(firstName && { firstName }),
            ...(middleName !== undefined && { middleName: middleName || null }),
            ...(lastName && { lastName }),
            ...(birthYear !== undefined && {
              birthYear: birthYear ? parseInt(birthYear) : null,
            }),
            ...(biography !== undefined && { biography: biography || null }),
            ...(biographyRedacted !== undefined && {
              biographyRedacted: biographyRedacted || null,
            }),
            profileImageId: profileImageId || null,
            updatedAt: new Date(),
          },
        });
      }

      // No profile image change
      return prisma.candidate.update({
        where: { id },
        data: {
          ...(firstName && { firstName }),
          ...(middleName !== undefined && { middleName: middleName || null }),
          ...(lastName && { lastName }),
          ...(birthYear !== undefined && {
            birthYear: birthYear ? parseInt(birthYear) : null,
          }),
          ...(biography !== undefined && { biography: biography || null }),
          ...(biographyRedacted !== undefined && {
            biographyRedacted: biographyRedacted || null,
          }),
          profileImageId,
          updatedAt: new Date(),
        },
      });
    });

    return new Response(JSON.stringify(candidate), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
