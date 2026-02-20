import prisma from "../prisma";
import { canManageElections } from "../permissions";
import { makeError } from "./utils";
import {
  uploadBuffer,
  deleteObject as deleteBlobObject,
  makeKeyForCandidateFile,
  getPublicUrl,
} from "../blobStorage";

export type BlobRecord = Awaited<
  ReturnType<typeof prisma.blobStorageReference.create>
>;

export async function uploadBlob(fileEntry: Blob): Promise<BlobRecord> {
  const hasPermission = await canManageElections();
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
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
    throw makeError("Only image uploads are allowed", 400);
  }

  const maxSize = 5 * 1024 * 1024;
  if (fileSize && fileSize > maxSize) {
    throw makeError("File too large (max 5 MB)", 400);
  }

  const arrayBuffer = await fileEntry.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const key = makeKeyForCandidateFile(fileName);

  await uploadBuffer(buffer, key, fileType || "application/octet-stream");

  // upsert image type record
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
      fileName,
      fileLocation: key,
      blobStorageTypeId: blobType.id,
    },
  });
  return record;
}

export async function deleteBlob(id: string): Promise<void> {
  const rec = await prisma.blobStorageReference.findUnique({ where: { id } });
  if (!rec) return;
  if (rec.fileLocation) {
    try {
      await deleteBlobObject(rec.fileLocation);
    } catch (_) {
      /* ignore */
    }
  }
  await prisma.blobStorageReference.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export { getPublicUrl };
