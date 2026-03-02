import type { ServiceAccount } from "firebase-admin";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import {
  getAuth,
  type DecodedIdToken,
  type UserRecord,
} from "firebase-admin/auth";
import { env } from "../lib/utils/environment";

const activeApps = getApps();
const getServiceAccount = (): ServiceAccount | undefined => {
  const base64Config = env("FIREBASE_SERVICE_ACCOUNT_64");
  if (base64Config) {
    try {
      const json = Buffer.from(base64Config, "base64").toString("utf-8");
      return JSON.parse(json);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_64", e);
    }
  }

  // Fallback to individual env vars
  if (env("FIREBASE_PROJECT_ID")) {
    return {
      type: "service_account",
      projectId: env("FIREBASE_PROJECT_ID"),
      privateKey: env("FIREBASE_PRIVATE_KEY")
        ?.split(String.raw`\n`)
        .join("\n"),
      clientEmail: env("FIREBASE_CLIENT_EMAIL"),
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

export const getSessionUser = async (
  sessionCookie: string | undefined,
): Promise<UserRecord | null> => {
  const auth = getAuth(app);
  if (!sessionCookie) {
    return null;
  }
  let decodedCookie: DecodedIdToken;
  try {
    decodedCookie = await auth.verifySessionCookie(sessionCookie);
  } catch (error) {
    console.error("Error verifying session cookie:", error);
    return null;
  }
  let user: UserRecord;
  try {
    user = await auth.getUser(decodedCookie.uid);
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  if (!user) {
    return null;
  }
  return user;
};
