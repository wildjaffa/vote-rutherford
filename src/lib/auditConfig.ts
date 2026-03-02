/**
 * Configuration for audit logging
 * Define which tables should be audited here
 */

export const AUDITED_MODEL = ["election", "race", "candidate"] as const;

export type AuditedModel = (typeof AUDITED_MODEL)[number];

const depascalize = (name: string) =>
  name && name.length > 0 && name[0]
    ? name[0].toLowerCase() + name.slice(1)
    : name;

export const isAuditedTable = (
  modelName: string,
): modelName is AuditedModel => {
  // Accept both the client-side model name (e.g. `election`, `userToElection`)
  // and the PascalCase server/model name (e.g. `Election`, `UserToElection`).
  if (AUDITED_MODEL.includes(modelName as AuditedModel)) return true;
  const depascal = depascalize(modelName);
  return AUDITED_MODEL.includes(depascal as AuditedModel);
};

export const getAuditedModelName = (modelName: string): AuditedModel | null => {
  if (AUDITED_MODEL.includes(modelName as AuditedModel)) {
    return modelName as AuditedModel;
  }
  const depascal = depascalize(modelName);
  if (AUDITED_MODEL.includes(depascal as AuditedModel)) {
    return depascal as AuditedModel;
  }
  return null;
};
