import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import type { Config } from "@libsql/client";
import { createAuditExtension } from "../../prisma/auditExtension";

const connectionString =
  process.env.DATABASE_URL || import.meta.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}
const config: Config = {
  url: connectionString,
};
config.authToken = process.env.AUTH_TOKEN || import.meta.env.AUTH_TOKEN;
if (process.env.SYNC_INTERVAL || import.meta.env.SYNC_INTERVAL) {
  config.syncInterval = Number(
    process.env.SYNC_INTERVAL || import.meta.env.SYNC_INTERVAL,
  );
}
config.syncUrl = process.env.SYNC_URL || import.meta.env.SYNC_URL;
if (config.syncUrl && !config.syncInterval) {
  config.syncInterval = 60; // Default to 1 minute, sync interval is in seconds
}

const adapter = new PrismaLibSql(config);

// Fixed UUID placeholder for system/unknown users
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

// Store user context for the current request
let currentUserContext: { userId: string } | null = null;

const basePrisma = new PrismaClient({
  adapter,
});

// Log module load so we can confirm this prisma instance is the one used at runtime
try {
  console.log("prisma module loaded", { pid: process.pid });
} catch (e) {
  console.error("prisma module load log failed", e);
  /* ignore */
}

const prisma = basePrisma.$extends(
  createAuditExtension(() => currentUserContext?.userId || SYSTEM_USER_ID),
);

// Apply audit extension (use a getter so the extension can read the current user id at operation time)

export default prisma;

/**
 * Execute a Prisma operation with a specific user context for audit logging
 * Usage: await withUserContext(userId, async () => {
 *   return prisma.model.create(...);
 * });
 */
export const withUserContext = async <T>(
  userId: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const previousContext = currentUserContext;
  try {
    console.log("withUserContext set", { userId });
  } catch (e) {
    console.error("withUserContext log failed", e);
    /* ignore */
  }
  currentUserContext = { userId };
  try {
    return await operation();
  } finally {
    try {
      console.log("withUserContext restore", { previousContext });
    } catch (e) {
      console.error("withUserContext restore log failed", e);
      /* ignore */
    }
    currentUserContext = previousContext;
  }
};
