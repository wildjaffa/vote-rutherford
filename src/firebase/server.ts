import type { ServiceAccount } from "firebase-admin";
import { initializeApp, cert, getApps } from "firebase-admin/app";

const activeApps = getApps();
const getServiceAccount = (): ServiceAccount | undefined => {
  const base64Config = import.meta.env.FIREBASE_SERVICE_ACCOUNT_64;
  if (base64Config) {
    try {
      const json = Buffer.from(base64Config, "base64").toString("utf-8");
      return JSON.parse(json);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_64", e);
    }
  }

  // Fallback to individual env vars
  if (import.meta.env.FIREBASE_PROJECT_ID) {
    return {
      type: "service_account",
      projectId: import.meta.env.FIREBASE_PROJECT_ID,
      privateKey: import.meta.env.FIREBASE_PRIVATE_KEY?.split(
        String.raw`\n`,
      ).join("\n"),
      clientEmail: import.meta.env.FIREBASE_CLIENT_EMAIL,
    } as ServiceAccount;
  }

  return undefined;
};

const initApp = () => {
  const serviceAccount = getServiceAccount();

  if (!serviceAccount) {
    console.warn("No Firebase service account found. Using default.");
    return initializeApp();
  }

  console.info("Loading service account from config.");
  return initializeApp({
    credential: cert(serviceAccount),
  });
};

export const app = activeApps.length === 0 ? initApp() : activeApps[0];
