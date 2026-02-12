import { Buffer } from "buffer";

// Mock implementation of the decoding logic from server.ts
const decodeServiceAccount = (base64Config: string) => {
  try {
    const json = Buffer.from(base64Config, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to parse", e);
    return null;
  }
};

const testServiceAccount = {
  type: "service_account",
  project_id: "test-project",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDh\n-----END PRIVATE KEY-----\n",
  client_email: "test@example.com",
};

const testBase64 = Buffer.from(JSON.stringify(testServiceAccount)).toString(
  "base64",
);

console.log("Verifying decoding logic...");
const decoded = decodeServiceAccount(testBase64);

if (
  decoded &&
  decoded.project_id === testServiceAccount.project_id &&
  decoded.private_key === testServiceAccount.private_key
) {
  console.log("✅ Decoding logic verified successfully!");
  process.exit(0);
} else {
  console.error("❌ Decoding logic verification failed!");
  console.error("Expected:", testServiceAccount);
  console.error("Actual:", decoded);
  process.exit(1);
}
