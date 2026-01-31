import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { isAuditedTable } from "./auditConfig";
import { computeHash, getPreviousHash } from "./auditHash";

const connectionString =
  import.meta.env.DATABASE_URL || process.env.DATABASE_URL;

const adapter = new PrismaPg({
  connectionString,
});

// Fixed UUID placeholder for system/unknown users
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
const AUDITED_OPERATIONS = [
  "create",
  "update",
  "delete",
  "updateMany",
  "deleteMany",
];

// Store user context for the current request
let currentUserContext: { userId: string } | null = null;

const prisma = new PrismaClient({
  adapter,
});

// Log module load so we can confirm this prisma instance is the one used at runtime
try {
  console.log("prisma module loaded", { pid: process.pid });
} catch (e) {
  /* ignore */
}

// const prisma = basePrisma.$extends({
// query: {
//   $allModels: {
//     async create({ model, args, query }) {
//       if (!AUDITED_OPERATIONS.includes("create") || !model) {
//         return query(args);
//       }
//       // Debug logging to confirm the extension is being invoked and capture raw params
//       try {
//         console.log(
//           "prisma.$extends create hook called params",
//           args && typeof args === "object"
//             ? {
//                 model: model,
//               }
//             : String(args),
//         );
//       } catch (e) {
//         // ignore logging errors
//       }
//       console.log("prisma.$extends create hook called", { model });
//       if (!isAuditedTable(model as string)) {
//         // If not an audited table, proceed without auditing
//         try {
//           console.log("prisma: model not audited, forwarding", { model });
//         } catch (e) {
//           /* ignore */
//         }
//         return query(args);
//       }
//       const result = await query(args);
//       // Get user context, fallback to system user
//       const userId = currentUserContext?.userId ?? SYSTEM_USER_ID;
//       // Only proceed if we have an entity with an id
//       if (result && result.id && typeof result.id === "string") {
//         const entityId = result.id;
//         // Get previous hash for chaining
//         const previousHash = await getPreviousHash(entityId, model as string);
//         // Compute current hash
//         const currentHash = computeHash(
//           result as Record<string, unknown>,
//           previousHash,
//         );
//         try {
//           // Create audit log entry using base client to avoid recursion
//           await basePrisma.auditLog.create({
//             data: {
//               entityType: model as string,
//               entityId,
//               userId,
//               action: "CREATE",
//               beforeState: null,
//               afterState: result,
//               previousHash,
//               currentHash,
//             },
//           });
//         } catch (error) {
//           // Log audit error but don't fail the main operation
//           console.error("Audit log creation failed:", error);
//         }
//       }
//       return result;
//     },
//   },
//   async $allOperations({ model, operation, args, query }) {
//     if (!AUDITED_OPERATIONS.includes(operation) || !model) {
//       return query(args);
//     }
//     // Debug logging to confirm the extension is being invoked and capture raw params
//     try {
//       console.log(
//         "prisma.$extends hook called params",
//         args && typeof args === "object"
//           ? {
//               operation: operation,
//               model: model,
//             }
//           : String(args),
//       );
//     } catch (e) {
//       // ignore logging errors
//     }
//     console.log("prisma.$extends hook called", { model, operation });
//     if (!isAuditedTable(model as string)) {
//       // If not an audited table, proceed without auditing
//       try {
//         console.log("prisma: model not audited, forwarding", { model });
//       } catch (e) {
//         /* ignore */
//       }
//       return query(args);
//     }
//     let beforeState: Record<string, unknown> | null = null;
//     // Capture before state for UPDATE and DELETE operations before executing the query
//     if (
//       (operation === "update" ||
//         operation === "updateMany" ||
//         operation === "delete" ||
//         operation === "deleteMany") &&
//       args.where
//     ) {
//       try {
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         beforeState = await (basePrisma as any)[model].findFirst({
//           where: args.where,
//         });
//       } catch {
//         // Continue even if fetching before state fails
//       }
//     }
//     const result = await query(args);
//     // Get user context, fallback to system user
//     const userId = currentUserContext?.userId ?? SYSTEM_USER_ID;
//     // Determine action type
//     let action: "CREATE" | "UPDATE" | "DELETE" = "UPDATE";
//     const afterState = Array.isArray(result) ? result[0] : result;
//     // Only proceed if we have an entity with an id
//     if (afterState && afterState.id && typeof afterState.id === "string") {
//       const entityId = afterState.id;
//       if (operation === "create") {
//         action = "CREATE";
//       } else if (operation === "delete" || operation === "deleteMany") {
//         action = "DELETE";
//       }
//       // Get previous hash for chaining
//       const previousHash = await getPreviousHash(entityId, model as string);
//       // Compute current hash
//       const currentHash = computeHash(
//         afterState as Record<string, unknown>,
//         previousHash,
//       );
//       try {
//         // Create audit log entry using base client to avoid recursion
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         await (basePrisma as any).auditLog.create({
//           data: {
//             entityType: model as string,
//             entityId,
//             userId,
//             action,
//             beforeState,
//             afterState,
//             previousHash,
//             currentHash,
//           },
//         });
//       } catch (error) {
//         // Log audit error but don't fail the main operation
//         console.error("Audit log creation failed:", error);
//       }
//     }
//     return query(args);
//   },
// },
// });

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
    /* ignore */
  }
  currentUserContext = { userId };
  try {
    return await operation();
  } finally {
    try {
      console.log("withUserContext restore", { previousContext });
    } catch (e) {
      /* ignore */
    }
    currentUserContext = previousContext;
  }
};
