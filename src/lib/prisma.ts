import { PrismaClient } from "../generated/prisma/client";
import { createAuditExtension } from "../../prisma/auditExtension";
import { env } from "./utils/environment";
import { PrismaPg } from "@prisma/adapter-pg";

// Fixed UUID placeholder for system/unknown users
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

// Store user context for the current request
let currentUserContext: { userId: string } | null = null;

// Lazily-initialized client. This defers DATABASE_URL resolution to
// the first database call at *runtime*, rather than at module-load time
// during the build phase (when env vars are not available).
let _prisma: ReturnType<typeof createPrismaClient> | null = null;

function createPrismaClient() {
  const connectionString = env("DATABASE_URL");

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  try {
    const adapter = new PrismaPg({ connectionString });
    const basePrisma = new PrismaClient({ adapter });

    console.log("Prisma client created successfully", { pid: process.pid });

    return basePrisma.$extends(
      createAuditExtension(() => currentUserContext?.userId || SYSTEM_USER_ID),
    );
  } catch (error) {
    console.error("Failed to initialize Prisma client", {
      error,
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
