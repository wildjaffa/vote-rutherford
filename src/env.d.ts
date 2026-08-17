/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly R2_ENDPOINT?: string;
  readonly R2_REGION?: string;
  readonly R2_ACCESS_KEY_ID?: string;
  readonly R2_SECRET_ACCESS_KEY?: string;
  readonly R2_BUCKET?: string;
  readonly R2_PUBLIC_URL?: string;
  readonly FIREBASE_SERVICE_ACCOUNT_64: string;
  readonly PUBLIC_FIREBASE_CLIENT_ACCOUNT_KEY: string;
  readonly CONTACT_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    /** Set by auth middleware for /admin and /api/admin routes. */
    user?: import("firebase-admin/auth").UserRecord;
  }
}
