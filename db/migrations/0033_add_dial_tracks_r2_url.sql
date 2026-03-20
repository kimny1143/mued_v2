-- Add r2_url column to dial_tracks for permanent R2 fallback URL
-- When GCS signed URLs expire (1h), we fall back to R2 for RoEx API calls
ALTER TABLE "dial_tracks" ADD COLUMN "r2_url" text;
