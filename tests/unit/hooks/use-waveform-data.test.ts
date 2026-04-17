import { describe, it, expect } from 'vitest';
import { extractPeaks } from '@/hooks/use-waveform-data';

function makeBuffer(samples: number[]): AudioBuffer {
  return {
    getChannelData: () => new Float32Array(samples),
    duration: samples.length / 44100,
    length: samples.length,
    numberOfChannels: 1,
    sampleRate: 44100,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

describe('extractPeaks', () => {
  it('returns array of given bucket count', () => {
    const buf = makeBuffer(new Array(4410).fill(0.5));
    const peaks = extractPeaks(buf, 10);
    expect(peaks).toHaveLength(10);
  });

  it('returns zeros for silent buffer', () => {
    const buf = makeBuffer(new Array(1000).fill(0));
    const peaks = extractPeaks(buf, 10);
    expect(peaks.every((p) => p === 0)).toBe(true);
  });

  it('returns correct peak amplitude for impulse signal', () => {
    // 120 samples, 1 bucket = 1 sample, single peak at position 5
    const samples = new Array(120).fill(0);
    samples[5] = 0.9;
    const buf = makeBuffer(samples);
    const peaks = extractPeaks(buf, 120);
    // bucket 5 should have peak 0.9, others 0
    expect(peaks[5]).toBeCloseTo(0.9);
    expect(peaks[0]).toBe(0);
    expect(peaks[119]).toBe(0);
  });
});
