// audit.extension.ts
import { createHash } from "crypto";
import { AuditAction, Prisma } from "../src/generated/prisma/client";
import type {
  DefaultArgs,
  DynamicClientExtensionThis,
  InternalArgs,
} from "@prisma/client/runtime/client";
import { getAuditedModelName, type AuditedModel } from "../src/lib/auditConfig";

// Audit user id provider: function that returns the current user id for audit logs.
// Using a getter lets the extension read the user id at operation time.
export function createAuditExtension(getUserId: () => string) {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      name: "audit",
      query: {
        // Apply to specific models
        $allModels: {
          async updateMany({ args, query, model }) {
            const modelName = getAuditedModelName(model);
            if (!modelName) {
              // Not an audited model
              return query(args);
            }
            // Fetch before states
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const beforeRecords = await (client[modelName] as any).findMany({
              where: args.where,
            });
            const result = await query(args);
            // Fetch after states
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const afterRecords = await (client[modelName] as any).findMany({
              where: args.where,
            });

            // Create audit logs for each changed record
            for (let i = 0; i < afterRecords.length; i++) {
              await createAuditLog(
                client,
                modelName,
                afterRecords[i],
                beforeRecords[i],
                getUserId,
                AuditAction.UPDATE,
              );
            }

            return result;
          },
          async deleteMany({ args, query, model }) {
            const modelName = getAuditedModelName(model);
            if (!modelName) {
              // Not an audited model
              return query(args);
            }
            // Fetch before states
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const beforeRecords = await (client[modelName] as any).findMany({
              where: args.where,
            });
            const result = await query(args);

            // Create audit logs for each deleted record
            for (const before of beforeRecords) {
              await createAuditLog(
                client,
                modelName,
                null,
                before,
                getUserId,
                AuditAction.DELETE,
              );
            }

            return result;
          },
          async upsert({ args, query, model }) {
            const modelName = getAuditedModelName(model);
            if (!modelName) {
              // Not an audited model
              return query(args);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const before = await (client[modelName] as any).findUnique({
              where: args.where,
            });
            const result = await query(args);
            if (before) {
              // It was an update
              await createAuditLog(
                client,
                modelName,
                result,
                before,
                getUserId,
                AuditAction.UPDATE,
              );
            } else {
              // It was a create
              await createAuditLog(
                client,
                modelName,
                result,
                null,
                getUserId,
                AuditAction.CREATE,
              );
            }
            return result;
          },
          async create({ args, query, model }) {
            const modelName = getAuditedModelName(model);
            if (!modelName) {
              // Not an audited model
              return query(args);
            }
            const result = await query(args);
            await createAuditLog(
              client,
              modelName,
              result,
              null,
              getUserId,
              AuditAction.CREATE,
            );
            return result;
          },

          async update({ args, query, model }) {
            const modelName = getAuditedModelName(model);
            if (!modelName) {
              // Not an audited model
              return query(args);
            }
            // Fetch before state
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const before = await (client[modelName] as any).findUnique({
              where: args.where,
            });
            const result = await query(args);
            await createAuditLog(
              client,
              modelName,
              result,
              before,
              getUserId,
              AuditAction.UPDATE,
            );
            return result;
          },

          async delete({ args, query, model }) {
            const modelName = getAuditedModelName(model);
            if (!modelName) {
              // Not an audited model
              return query(args);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const before = await (client[modelName] as any).findUnique({
              where: args.where,
            });

            const result = await query(args);
            await createAuditLog(
              client,
              modelName,
              null,
              before,
              getUserId,
              AuditAction.DELETE,
            );
            return result;
          },
        },
      },
    });
  });
}

async function createAuditLog(
  client: DynamicClientExtensionThis<
    Prisma.TypeMap<InternalArgs & DefaultArgs, unknown>,
    Prisma.TypeMapCb<unknown>,
    DefaultArgs
  >,
  modelName: AuditedModel,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterState: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeState: any,
  getUserId: () => string,
  action: AuditAction,
) {
  // Get the last audit entry for hash chaining
  const lastAudit = await client.auditLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { currentHash: true },
  });

  const now = new Date();
  const afterJson = afterState
    ? JSON.stringify(sanitizeForAudit(afterState))
    : null;
  const hash = generateHash(
    lastAudit?.currentHash || "",
    now.toISOString(),
    afterJson || "",
  );

  await client.auditLog.create({
    data: {
      userId: getUserId(),
      entityId: afterState?.id || beforeState?.id,
      entityType: modelName,
      beforeState: beforeState
        ? sanitizeForAudit(beforeState)
        : Prisma.JsonNull,
      afterState: afterState ? sanitizeForAudit(afterState) : Prisma.JsonNull,
      createdAt: now,
      currentHash: hash,
      previousHash: lastAudit?.currentHash || null,
      action,
      deletedAt: action === AuditAction.DELETE ? now : null,
    },
  });
}

function generateHash(
  previousHash: string,
  date: string,
  afterState: string,
): string {
  return createHash("sha256")
    .update(`${previousHash}${date}${afterState}`)
    .digest("hex");
}

function sanitizeForAudit<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForAudit) as unknown as T;
  }
  if ("password" in obj) {
    // redact password fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any).password = "[REDACTED]";
  }

  return obj;
}
