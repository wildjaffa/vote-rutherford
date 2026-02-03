import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const R2_ENDPOINT = process.env.R2_ENDPOINT || import.meta.env.R2_ENDPOINT;
const R2_REGION = process.env.R2_REGION || "auto";
const R2_ACCESS_KEY_ID =
  process.env.R2_ACCESS_KEY_ID || import.meta.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY =
  process.env.R2_SECRET_ACCESS_KEY || import.meta.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || import.meta.env.R2_BUCKET;
const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL || import.meta.env.R2_PUBLIC_URL; // e.g. https://<accountid>.r2.cloudflarestorage.com/<bucket>

if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  // Do not throw here; allow local/dev without R2 configured. Calls will error when used.
  console.warn(
    "R2 configuration incomplete - blob storage will not work until env vars are set.",
  );
}
const config = {
  region: R2_REGION,
  endpoint: R2_ENDPOINT as string,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID as string,
    secretAccessKey: R2_SECRET_ACCESS_KEY as string,
  },
};

const s3 = new S3Client(config);

export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return {
    key,
    url: getPublicUrl(key),
  };
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

export function getPublicUrl(key: string) {
  if (!R2_PUBLIC_URL) return key;
  return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

export function makeKeyForCandidateFile(fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const prefix = `candidates/${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}-${safe}`;
}

export function convertKeyToPublicUrl(
  key: string | undefined | null,
): string | null {
  if (!key) return null;
  if (key.startsWith("data:")) return key;
  const publicUrl = import.meta.env.R2_PUBLIC_URL;
  console.log("convertKeyToPublicUrl", { key, publicUrl });
  if (!publicUrl) {
    return key;
  }
  const fullUrl = `${publicUrl.replace(/\/$/, "")}/${key}`;
  console.log("fullUrl", fullUrl);
  return fullUrl;
}
