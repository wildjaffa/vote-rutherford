import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../../utils/environment";

const ENCRYPTION_VERSION = "v1";

function getEncryptionKey(): Buffer {
  const encodedKey = env("SEARCH_ANALYTICS_ENCRYPTION_KEY");
  if (!encodedKey || !/^[a-f\d]{64}$/i.test(encodedKey)) {
    throw new Error(
      "SEARCH_ANALYTICS_ENCRYPTION_KEY must be set to a 32-byte (64-character) hex key",
    );
  }
  return Buffer.from(encodedKey, "hex");
}

export function encryptCredentials(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(".");
}

export function decryptCredentials<T>(value: string): T {
  const [version, ivHex, tagHex, encryptedHex] = value.split(".");
  if (
    version !== ENCRYPTION_VERSION ||
    !ivHex ||
    !tagHex ||
    !encryptedHex
  ) {
    throw new Error("Stored search analytics credentials have an invalid format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(decrypted) as T;
}
