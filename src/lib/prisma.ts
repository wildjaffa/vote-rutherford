import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import type { Config } from "@libsql/client";
import { createAuditExtension } from "../../prisma/auditExtension";

// Fixed UUID placeholder for system/unknown users
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

// Store user context for the current request
let currentUserContext: { userId: string } | null = null;

// Lazily-initialized Prisma client. This defers DATABASE_URL resolution to
// the first database call at *runtime*, rather than at module-load time
// during the build phase (when env vars are not available).
let _prisma: ReturnType<typeof createPrismaClient> | null = null;

// Helper to read an env var from either process.env (Node/Docker runtime)
// or import.meta.env (Vite/Astro dev server).
function env(key: string): string | undefined {
  return process.env[key] ?? (import.meta.env as Record<string, string>)?.[key];
}

function createPrismaClient() {
  const connectionString = env("DATABASE_URL");

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  const config: Config = {
    url: connectionString,
  };

  const authToken = env("AUTH_TOKEN");
  if (authToken) {
    config.authToken = authToken;
  }

  const syncInterval = env("SYNC_INTERVAL");
  if (syncInterval) {
    config.syncInterval = Number(syncInterval);
  }

  const syncUrl = env("SYNC_URL");
  if (syncUrl) {
    console.log("prisma syncUrl", { syncUrl });
    config.syncUrl = syncUrl;
    if (!config.syncInterval) {
      config.syncInterval = 60; // Default to 1 minute, sync interval is in seconds
    }
  }

  const adapter = new PrismaLibSql(config);
  const basePrisma = new PrismaClient({ adapter });

  try {
    console.log("prisma module loaded", { pid: process.pid });
  } catch (e) {
    console.error("prisma module load log failed", e);
  }

  return basePrisma.$extends(
    createAuditExtension(() => currentUserContext?.userId || SYSTEM_USER_ID),
  );
}

function getPrisma() {
  if (!_prisma) {
    _prisma = createPrismaClient();
  }
  return _prisma;
}

// Proxy that forwards all property accesses to the lazily-created client.
// This keeps the existing `import prisma from '...'` usage unchanged.
const prisma = new Proxy({} as ReturnType<typeof createPrismaClient>, {
  get(_target, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

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
