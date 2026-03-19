import type { RoExClient } from './client';
import type { UploadUrlResponse } from './types';

/**
 * Step 1: Request a signed upload URL from RoEx.
 * Returns { signedUrl, readableUrl }.
 *
 * In mued_v2, the browser PUTs the file directly to signedUrl
 * to avoid Vercel's 4.5MB body size limit.
 */
export async function getUploadUrl(
  client: RoExClient,
  fileName: string,
): Promise<UploadUrlResponse> {
  // Infer content type from extension
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'wav';
  const contentTypeMap: Record<string, string> = {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    flac: 'audio/flac',
    aiff: 'audio/aiff',
    aif: 'audio/x-aiff',
  };
  const contentType = contentTypeMap[ext] ?? 'audio/wav';

  const res = await client.post<{
    signedUrl?: string;
    signed_url?: string;
    readableUrl?: string;
    readable_url?: string;
  }>('/upload', { filename: fileName, contentType });

  const signedUrl = res.signedUrl ?? res.signed_url;
  const readableUrl = res.readableUrl ?? res.readable_url;

  if (!signedUrl || !readableUrl) {
    throw new Error('RoEx /upload did not return expected URLs');
  }

  return { signedUrl, readableUrl };
}

/**
 * Step 2: Upload file data to the signed URL.
 * This can be called server-side (for small files) or
 * the signedUrl can be given to the browser for direct upload.
 */
export async function uploadToSignedUrl(
  signedUrl: string,
  data: Blob | ArrayBuffer,
  contentType = 'audio/wav',
): Promise<void> {
  const blob = data instanceof Blob ? data : new Blob([data], { type: contentType });
  const res = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  if (!res.ok) {
    throw new Error(`Upload to signed URL failed (${res.status})`);
  }
}
