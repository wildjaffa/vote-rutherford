/**
 * Configuration for audit logging
 * Define which tables should be audited here
 */

export const AUDITED_TABLES = ["Election", "Race", "Candidate"] as const;

export type AuditedTable = (typeof AUDITED_TABLES)[number];

const pascalize = (name: string) =>
  name && name.length > 0 ? name[0].toUpperCase() + name.slice(1) : name;

export const isAuditedTable = (
  modelName: string,
): modelName is AuditedTable => {
  // Accept both the client-side model name (e.g. `election`, `userToElection`)
  // and the PascalCase server/model name (e.g. `Election`, `UserToElection`).
  if (AUDITED_TABLES.includes(modelName as AuditedTable)) return true;
  const pascal = pascalize(modelName);
  return AUDITED_TABLES.includes(pascal as AuditedTable);
};
