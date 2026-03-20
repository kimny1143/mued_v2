/**
 * MUEDial Stems Download API
 * GET /api/dial/stems?taskId=xxx
 *
 * Downloads all processed stems for a completed final task as a ZIP file.
 * Streams the ZIP to avoid holding all files in memory.
 */

import { NextResponse } from 'next/server';
import { PassThrough } from 'stream';
import archiver from 'archiver';
import { eq } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { apiValidationError, apiNotFound, apiError } from '@/lib/api-response';
import { db } from '@/db';
import { dialTracks } from '@/db/schema';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min for large stem sets (14 × 80MB)

export const GET = withDialAuth(async (auth) => {
  const { searchParams } = new URL(auth.request.url);
  const taskId = searchParams.get('taskId');
  if (!taskId) {
    return apiValidationError('taskId is required');
  }

  const result = await verifyDialTaskOwnership(taskId, auth);
  if (!result) {
    return apiNotFound('Task not found');
  }

  const { task, session } = result;

  if (task.status !== 'completed') {
    return apiError('Task is not completed', { code: 'NOT_COMPLETED', status: 400 });
  }

  const stemsUrls = task.stemsUrls as Record<string, string> | null;
  if (!stemsUrls || Object.keys(stemsUrls).length === 0) {
    return apiError('No stems available for this task', { code: 'NO_STEMS', status: 404 });
  }

  // Build UUID → original filename mapping from dial_tracks
  const tracks = await db.query.dialTracks.findMany({
    where: eq(dialTracks.sessionId, task.sessionId),
  });
  const uuidToName = new Map<string, string>();
  for (const t of tracks) {
    // Extract UUID from roex_upload_url: ".../tonn-user-upload/{uuid}.wav?..."
    const match = t.roexUploadUrl.match(/\/([0-9a-f-]{36})\.wav/i);
    if (match) {
      uuidToName.set(match[1], t.originalFilename);
    }
  }

  // Create streaming ZIP archive (store mode — no compression for WAV files)
  const archive = archiver('zip', { store: true });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  // Fetch stems sequentially to avoid OOM (14 × 80MB = 1.1GB concurrent)
  for (const [name, url] of Object.entries(stemsUrls)) {
    try {
      const res = await fetch(url);
      if (!res.ok || !res.body) continue;

      // Convert web ReadableStream to Node Readable with backpressure
      const reader = res.body.getReader();
      const nodeStream = new PassThrough();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { nodeStream.end(); break; }
          if (!nodeStream.write(value)) {
            await new Promise<void>(resolve => nodeStream.once('drain', resolve));
          }
        }
      };
      pump().catch(() => nodeStream.destroy());

      // Resolve UUID stem name to original track filename
      const stemUuid = name.replace(/\.wav$/i, '');
      const originalName = uuidToName.get(stemUuid);
      const filename = originalName
        ? (originalName.endsWith('.wav') ? originalName : `${originalName}.wav`)
        : (name.endsWith('.wav') ? name : `${name}.wav`);
      archive.append(nodeStream, { name: filename });
    } catch {
      // Skip failed stems — don't break the entire ZIP
    }
  }

  archive.finalize();

  // Convert Node PassThrough to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      passthrough.on('data', (chunk) => controller.enqueue(chunk));
      passthrough.on('end', () => controller.close());
      passthrough.on('error', (err) => controller.error(err));
    },
  });

  const displayName = session.title || session.id.slice(0, 8);
  const safeFilename = displayName.replace(/[^a-zA-Z0-9_-]/g, '_') + '-stems.zip';

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
    },
  });
});
