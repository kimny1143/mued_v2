/**
 * Measures integrated LUFS (ITU-R BS.1770-4 / EBU R128) from an AudioBuffer.
 *
 * Uses OfflineAudioContext + ebur128-processor AudioWorklet for accurate BS.1770-4
 * K-weighting. A 100ms timeout after rendering ensures all port messages are flushed.
 * Falls back to -70 if the worklet is unavailable or signal is below gate threshold.
 */
export async function measureIntegratedLufs(buffer: AudioBuffer): Promise<number> {
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate,
  );

  try {
    await offlineCtx.audioWorklet.addModule('/worklets/ebur128-processor.js');
  } catch {
    console.warn('[measureIntegratedLufs] ebur128 worklet load failed — returning -70');
    return -70;
  }

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  let lastIntegrated = -70;
  const worklet = new AudioWorkletNode(offlineCtx, 'ebur128-processor');
  worklet.port.onmessage = (e: MessageEvent<{ integrated: number }>) => {
    const v = e.data?.integrated;
    if (typeof v === 'number' && isFinite(v)) lastIntegrated = v;
  };

  source.connect(worklet);
  worklet.connect(offlineCtx.destination);
  source.start(0);

  await offlineCtx.startRendering();
  // Allow the event loop to flush all pending port messages from the worklet
  await new Promise<void>((r) => setTimeout(r, 100));

  return isFinite(lastIntegrated) ? lastIntegrated : -70;
}
