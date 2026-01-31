import crypto from "crypto";
import prisma from "./prisma";

/**
 * Compute SHA-256 hash of afterState concatenated with previousHash
 * Creates a cryptographic chain where each entry depends on the previous one
 */
export const computeHash = (
  afterState: Record<string, any>,
  previousHash: string | null,
): string => {
  const stateString = JSON.stringify(afterState);
  const chainString = stateString + (previousHash || "");
  return crypto.createHash("sha256").update(chainString).digest("hex");
};

/**
 * Fetch the most recent audit log entry for an entity to get its hash
 * Used to chain the next audit log entry
 */
export const getPreviousHash = async (
  entityId: string,
  entityType: string,
): Promise<string | null> => {
  const lastEntry = await prisma.auditLog.findFirst({
    where: {
      entityId,
      entityType,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      currentHash: true,
    },
  });

  return lastEntry?.currentHash ?? null;
};
