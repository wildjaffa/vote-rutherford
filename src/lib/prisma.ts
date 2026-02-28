import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import type { Config } from "@libsql/client";
import { createAuditExtension } from "../../prisma/auditExtension";
import fs from "node:fs";
import path from "node:path";
import { env } from "./utils/environment";

// Fixed UUID placeholder for system/unknown users
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

// Store user context for the current request
let currentUserContext: { userId: string } | null = null;

// Lazily-initialized Prisma client. This defers DATABASE_URL resolution to
// the first database call at *runtime*, rather than at module-load time
// during the build phase (when env vars are not available).
let _prisma: ReturnType<typeof createPrismaClient> | null = null;

function createPrismaClient() {
  const connectionString = env("DATABASE_URL");

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  const syncUrl = env("SYNC_URL");
  const authToken = env("AUTH_TOKEN");
  const syncInterval = env("SYNC_INTERVAL");

  // Robust LibSQL initialization:
  // If we are using a local replica (DATABASE_URL is a file), we need to ensure
  // the local state is valid. LibSQL throws error if the .db file exists but its
  // metadata file is missing.
  if (connectionString.startsWith("file:") && syncUrl) {
    const dbPath = connectionString.replace("file:", "");
    const absolutePath = path.isAbsolute(dbPath)
      ? dbPath
      : path.join(process.cwd(), dbPath);
    const metadataPath = `${absolutePath}-metadata`;

    try {
      if (fs.existsSync(absolutePath) && !fs.existsSync(metadataPath)) {
        console.warn(
          "LibSQL invalid local state detected: db file exists but metadata file does not. Cleaning up local db file to trigger fresh sync.",
          { absolutePath, metadataPath },
        );
        fs.unlinkSync(absolutePath);

        // Also clean up wal/shm files if they exist
        ["-wal", "-shm"].forEach((suffix) => {
          const sidecar = absolutePath + suffix;
          if (fs.existsSync(sidecar)) {
            fs.unlinkSync(sidecar);
          }
        });
      }
    } catch (err) {
      console.error("Failed to clean up invalid LibSQL state", err);
    }
  }

  const config: Config = {
    url: connectionString,
  };

  if (authToken) {
    config.authToken = authToken;
  }

  if (syncInterval) {
    config.syncInterval = Number(syncInterval);
  }

  if (syncUrl) {
    console.log("prisma syncUrl", { syncUrl });
    config.syncUrl = syncUrl;
    if (!config.syncInterval) {
      config.syncInterval = 60; // Default to 1 minute, sync interval is in seconds
    }
  }

  try {
    const adapter = new PrismaLibSql(config);
    const basePrisma = new PrismaClient({ adapter });

    console.log("Prisma client created successfully", { pid: process.pid });

    return basePrisma.$extends(
      createAuditExtension(() => currentUserContext?.userId || SYSTEM_USER_ID),
    );
  } catch (error) {
    console.error("Failed to initialize Prisma client with LibSQL adapter", {
      error,
      connectionString,
      syncUrl: !!syncUrl,
    });
    throw error;
  }
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
