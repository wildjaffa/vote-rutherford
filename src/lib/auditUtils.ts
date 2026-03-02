import prisma from "./prisma";
import { computeHash } from "./auditHash";

export interface AuditChainEntry {
  id: string;
  entityType: string;
  entityId: string;
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown>;
  previousHash: string | null;
  currentHash: string;
  createdAt: Date;
  isHashValid: boolean;
}

export interface AuditChainVerification {
  entries: AuditChainEntry[];
  isChainIntact: boolean;
  tamperedEntryIds: string[];
}

/**
 * Fetch the complete audit history for a specific entity
 * Verifies hash integrity to detect any tampering
 */
export const getEntityAuditChain = async (
  entityId: string,
  entityType: string,
): Promise<AuditChainVerification> => {
  const entries = await prisma.auditLog.findMany({
    where: {
      entityId,
      entityType,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const chainEntries: AuditChainEntry[] = [];
  const tamperedEntryIds: string[] = [];
  let isChainIntact = true;

  // Verify each entry's hash
  for (const entry of entries) {
    const expectedHash = computeHash(
      entry.afterState as Record<string, unknown>,
      entry.previousHash,
    );

    const isHashValid = expectedHash === entry.currentHash;

    if (!isHashValid) {
      isChainIntact = false;
      tamperedEntryIds.push(entry.id);
    }

    chainEntries.push({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      userId: entry.userId,
      action: entry.action,
      beforeState: entry.beforeState as Record<string, unknown> | null,
      afterState: entry.afterState as Record<string, unknown>,
      previousHash: entry.previousHash,
      currentHash: entry.currentHash,
      createdAt: entry.createdAt,
      isHashValid,
    });
  }

  return {
    entries: chainEntries,
    isChainIntact,
    tamperedEntryIds,
  };
};

/**
 * Get audit history for multiple entities (useful for batch audits)
 */
export const getEntitiesAuditChains = async (
  entityIds: string[],
  entityType: string,
): Promise<Map<string, AuditChainVerification>> => {
  const result = new Map<string, AuditChainVerification>();

  for (const entityId of entityIds) {
    const chain = await getEntityAuditChain(entityId, entityType);
    result.set(entityId, chain);
  }

  return result;
};

/**
 * Get recent audit activity across all entities of a type
 * Useful for activity feeds or dashboards
 */
export const getRecentAuditActivity = async (
  entityType: string,
  limit = 50,
) => {
  return await prisma.auditLog.findMany({
    where: {
      entityType,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
};

/**
 * Get audit activity by user
 */
export const getUserAuditActivity = async (userId: string, limit = 50) => {
  return await prisma.auditLog.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
};

/**
 * Soft delete an audit log entry (mark as deleted but retain for recovery)
 * This would be done if an audit entry needs to be removed for legal reasons
 */
export const deleteAuditLogEntry = async (entryId: string) => {
  return await prisma.auditLog.update({
    where: { id: entryId },
    data: { deletedAt: new Date() },
  });
};
