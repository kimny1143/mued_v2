import { describe, it, expect } from 'vitest';
import { calcReadinessScore } from '@/lib/research/readiness-score';

describe('calcReadinessScore', () => {
  it('all flags true → score=4, qualified=true, launch_ready_recent=true', () => {
    const result = calcReadinessScore({
      launches_within_30d: true,
      has_stems: true,
      vocal_ready: true,
      product_intent: 'mastering',
    });
    expect(result).toEqual({ score: 4, qualified: true, launch_ready_recent: true });
  });

  it('score=3 (boundary) → qualified=true', () => {
    const result = calcReadinessScore({
      launches_within_30d: true,
      has_stems: true,
      vocal_ready: true,
      product_intent: null,
    });
    expect(result).toEqual({ score: 3, qualified: true, launch_ready_recent: true });
  });

  it('score=2 → qualified=false', () => {
    const result = calcReadinessScore({
      launches_within_30d: true,
      has_stems: true,
      vocal_ready: false,
      product_intent: null,
    });
    expect(result).toEqual({ score: 2, qualified: false, launch_ready_recent: true });
  });

  it('product_intent="unknown" does not count toward score', () => {
    const result = calcReadinessScore({
      launches_within_30d: true,
      has_stems: true,
      vocal_ready: true,
      product_intent: 'unknown',
    });
    expect(result).toEqual({ score: 3, qualified: true, launch_ready_recent: true });
  });

  it('product_intent="mixing" counts toward score', () => {
    const result = calcReadinessScore({
      launches_within_30d: false,
      has_stems: true,
      vocal_ready: true,
      product_intent: 'mixing',
    });
    expect(result).toEqual({ score: 3, qualified: true, launch_ready_recent: false });
  });

  it('no flags set → score=0, qualified=false, launch_ready_recent=false', () => {
    const result = calcReadinessScore({});
    expect(result).toEqual({ score: 0, qualified: false, launch_ready_recent: false });
  });

  it('launches_within_30d=false → launch_ready_recent=false even if other flags true', () => {
    const result = calcReadinessScore({
      launches_within_30d: false,
      has_stems: true,
      vocal_ready: true,
      product_intent: 'mastering',
    });
    expect(result.launch_ready_recent).toBe(false);
    expect(result.qualified).toBe(true);
  });
});
