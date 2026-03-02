interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly R2_ENDPOINT?: string;
  readonly R2_REGION?: string;
  readonly R2_ACCESS_KEY_ID?: string;
  readonly R2_SECRET_ACCESS_KEY?: string;
  readonly R2_BUCKET?: string;
  readonly R2_PUBLIC_URL?: string;
  readonly FIREBASE_SERVICE_ACCOUNT_64: string;
  readonly CONTACT_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
