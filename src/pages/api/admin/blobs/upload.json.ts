import type { APIRoute } from "astro";
import prisma from "../../../../lib/prisma";
import { canManageElections } from "../../../../lib/permissions";
import {
  uploadBuffer,
  makeKeyForCandidateFile,
} from "../../../../lib/blobStorage";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const hasPermission = await canManageElections();
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!fileEntry || !(fileEntry instanceof Blob)) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fileMeta = fileEntry as unknown as {
      name?: string;
      type?: string;
      size?: number;
    };
    const fileName = fileMeta.name || "upload";
    const fileType = fileMeta.type || "";
    const fileSize = fileMeta.size || 0;

    if (fileType && !fileType.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "Only image uploads are allowed" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (fileSize && fileSize > maxSize) {
      return new Response(
        JSON.stringify({ error: "File too large (max 5 MB)" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const arrayBuffer = await (fileEntry as Blob).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const key = makeKeyForCandidateFile(fileName);

    await uploadBuffer(buffer, key, fileType || "application/octet-stream");

    // Ensure blob storage type exists
    let blobType = await prisma.blobStorageType.findFirst({
      where: { value: "image" },
    });
    if (!blobType) {
      blobType = await prisma.blobStorageType.create({
        data: { value: "image" },
      });
    }

    const record = await prisma.blobStorageReference.create({
      data: {
        fileType: fileType || "image",
        fileName: fileName,
        fileLocation: key,
        blobStorageTypeId: blobType.id,
      },
    });

    return new Response(JSON.stringify(record), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error uploading blob:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
