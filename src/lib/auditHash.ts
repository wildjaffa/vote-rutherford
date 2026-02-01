import crypto from "crypto";

/**
 * Compute SHA-256 hash of afterState concatenated with previousHash
 * Creates a cryptographic chain where each entry depends on the previous one
 */
export const computeHash = (
  afterState: Record<string, unknown>,
  previousHash: string | null,
): string => {
  const stateString = JSON.stringify(afterState);
  const chainString =
    stateString + (previousHash || "") + new Date().toISOString();
  return crypto.createHash("sha256").update(chainString).digest("hex");
};
