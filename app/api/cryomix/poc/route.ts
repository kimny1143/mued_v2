import { NextResponse } from 'next/server';
import { createCryoMixClient } from '@/lib/cryomix';
import type { CryoMixStatus } from '@/lib/cryomix';

/**
 * Cryo Mix PoC — Dev-only endpoint for full API flow verification.
 *
 * POST /api/cryomix/poc
 * Body: { audioUrl: string, fileName?: string }
 *
 * Steps: Upload → Run Mastering → Poll → Purchase → Download
 *
 * Blocked in production via NODE_ENV check.
 */

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // 3s × 60 = 3 minutes max

export async function POST(request: Request) {
  // Dev-only guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'PoC endpoint is disabled in production' }, { status: 403 });
  }

  try {
    const body = await request.json() as { audioUrl?: string; fileName?: string };
    if (!body.audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 });
    }

    const client = createCryoMixClient();
    const fileName = body.fileName ?? 'test-audio.wav';
    const log: string[] = [];

    // ─── Step 1: Get signed upload URL ──────────────────────────────────
    log.push('Step 1: Requesting upload URL...');
    const uploadRes = await client.upload({
      objectNames: [fileName],
      contentType: 'audio/wav',
    });
    const sessionId = client.getSessionId();
    log.push(`Upload URL received. Session ID: ${sessionId}`);

    const signedUrls = uploadRes.data.upload_object_names;
    const signedUrl = Object.values(signedUrls)[0];
    if (!signedUrl) {
      return NextResponse.json({ error: 'No signed URL returned', log }, { status: 500 });
    }

    // ─── Step 2: Download source audio and upload to Cryo Mix ───────────
    log.push('Step 2: Downloading source audio and uploading to Cryo Mix...');
    const audioResponse = await fetch(body.audioUrl);
    if (!audioResponse.ok) {
      return NextResponse.json({
        error: `Failed to fetch source audio: ${audioResponse.status}`,
        log,
      }, { status: 400 });
    }
    const audioBuffer = await audioResponse.arrayBuffer();
    await client.uploadToSignedUrl(signedUrl, audioBuffer, 'audio/wav');
    log.push(`Uploaded ${(audioBuffer.byteLength / 1024 / 1024).toFixed(1)}MB to Cryo Mix`);

    // ─── Step 3: Run mastering (default params) ─────────────────────────
    log.push('Step 3: Starting mastering...');
    await client.runMastering();
    log.push('Mastering started');

    // ─── Step 4: Poll progress ──────────────────────────────────────────
    log.push('Step 4: Polling progress...');
    let status: CryoMixStatus = 'pending';
    let percentage = 0;

    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      const progress = await client.pollProgress();
      status = progress.data.status;
      percentage = progress.data.percentage_complete;
      log.push(`  Poll ${i + 1}: ${status} (${percentage}%)`);

      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        break;
      }
    }

    if (status !== 'completed') {
      return NextResponse.json({
        error: `Mastering did not complete. Final status: ${status} (${percentage}%)`,
        log,
      }, { status: 500 });
    }
    log.push('Mastering completed');

    // ─── Step 5: Purchase (test domain = no charge) ─────────────────────
    log.push('Step 5: Purchasing mastered file...');
    await client.purchase({
      firstName: 'MUED',
      lastName: 'Test',
      email: 'test@mued.jp',
    });
    log.push('Purchase successful');

    // ─── Step 6: Download URLs ──────────────────────────────────────────
    log.push('Step 6: Getting download URLs...');
    const downloadRes = await client.download(3600); // 1h expiry
    const downloadUrls = downloadRes.data.download_audio_urls;
    log.push(`Download URLs received: ${Object.keys(downloadUrls).join(', ')}`);

    return NextResponse.json({
      success: true,
      sessionId,
      downloadUrls,
      log,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
