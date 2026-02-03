# Blob Storage (Cloudflare R2) Setup

This project uses a small storage adapter to upload candidate profile images and store metadata in `BlobStorageReference`.

## Environment variables

Add these to your environment / Docker compose when using R2:

- `R2_ENDPOINT` — S3-compatible endpoint for your R2 account (e.g. `https://<accountid>.r2.cloudflarestorage.com`)
- `R2_REGION` — optional region (can be `auto`)
- `R2_ACCESS_KEY_ID` — R2 access key
- `R2_SECRET_ACCESS_KEY` — R2 secret key
- `R2_BUCKET` — bucket name
- `R2_PUBLIC_URL` — optional public base URL used to construct public URLs for uploaded objects (e.g. `https://<accountid>.r2.cloudflarestorage.com/<bucket>`)

## Added routes & helpers

- `src/lib/blobStorage.ts` — simple S3 client wrapper with `uploadBuffer`, `deleteObject`, `getPublicUrl`, and `makeKeyForCandidateFile`.
- `POST /api/admin/blobs/upload.json` — accepts multipart/form-data `{ file }` and creates a `BlobStorageReference` (blob type `image`). Returns the new record JSON.

## Admin UI

- Admin candidate create/edit forms now include a `Profile Image` file input. The file is uploaded immediately to `/api/admin/blobs/upload.json` when selected, and the returned `id` is attached to the candidate via the existing create/update flows.

## Notes

- Uploaded files are validated (image/\*, <= 5MB).
- Uploaded objects are stored with a generated key and `fileLocation` stores the key. Public URLs are constructed from `R2_PUBLIC_URL` if present; otherwise templates fall back to `/<fileLocation>`.
- When replacing a candidate's profile image we soft-delete the previous `BlobStorageReference.deletedAt` and attempt to delete the object from R2 (best-effort).

If you'd like, I can also:

- Add optional background job to delete objects later
- Add presigned upload support for direct uploads
- Add tests for the new endpoint
