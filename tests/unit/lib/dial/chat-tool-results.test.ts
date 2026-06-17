import { describe, it, expect } from 'vitest';
import {
  syntheticToolResultContent,
  deriveChatTaskState,
  textProposesPreview,
  type PersistedToolUseBlock,
  type ChatTaskState,
} from '@/lib/dial/chat-tool-results';

const NONE: ChatTaskState = {
  hasCompletedPreview: false,
  hasCompletedMixRender: false,
  hasCompletedMastering: false,
};

const block = (name: string, action?: string, extra?: Record<string, unknown>): PersistedToolUseBlock => ({
  id: `b-${name}-${action ?? 'x'}`,
  name,
  input: { action, ...extra },
});

describe('deriveChatTaskState', () => {
  it('flags a completed preview only when a preview task is completed', () => {
    expect(deriveChatTaskState([]).hasCompletedPreview).toBe(false);
    expect(
      deriveChatTaskState([{ taskType: 'preview', status: 'processing' }]).hasCompletedPreview,
    ).toBe(false);
    expect(
      deriveChatTaskState([{ taskType: 'preview', status: 'completed' }]).hasCompletedPreview,
    ).toBe(true);
  });

  it('treats mix_check / final_basic / final_advanced as mix renders', () => {
    for (const taskType of ['mix_check', 'final_basic', 'final_advanced']) {
      expect(
        deriveChatTaskState([{ taskType, status: 'completed' }]).hasCompletedMixRender,
      ).toBe(true);
    }
    expect(
      deriveChatTaskState([{ taskType: 'final_advanced', status: 'failed' }]).hasCompletedMixRender,
    ).toBe(false);
  });

  it('flags mastering only when a mastering task is completed', () => {
    expect(
      deriveChatTaskState([{ taskType: 'mastering', status: 'completed' }]).hasCompletedMastering,
    ).toBe(true);
    expect(
      deriveChatTaskState([{ taskType: 'mastering', status: 'processing' }]).hasCompletedMastering,
    ).toBe(false);
  });
});

describe('syntheticToolResultContent — adjust_preview (the Yuu dead-end)', () => {
  it('tells Hoo NO preview exists + to regenerate when none is completed', () => {
    const out = syntheticToolResultContent(block('propose_mix_action', 'adjust_preview'), NONE);
    expect(out).toMatch(/NO preview/i);
    expect(out).toMatch(/adjust_preview/);
    expect(out).toMatch(/do NOT tell the user a preview already exists/i);
    // critically, it must NOT be the old hardcoded success token
    expect(out).not.toBe('ok');
  });

  it('confirms success once a preview is completed', () => {
    const out = syntheticToolResultContent(block('propose_mix_action', 'adjust_preview'), {
      ...NONE,
      hasCompletedPreview: true,
    });
    expect(out).toMatch(/^ok/);
    expect(out).toMatch(/preview has been generated/i);
  });
});

describe('syntheticToolResultContent — render / mastering actions', () => {
  it('reports no render when none completed, success when one exists', () => {
    for (const action of ['request_mix_check', 'request_final']) {
      expect(syntheticToolResultContent(block('propose_mix_action', action), NONE)).toMatch(
        /no completed mix render/i,
      );
      expect(
        syntheticToolResultContent(block('propose_mix_action', action), {
          ...NONE,
          hasCompletedMixRender: true,
        }),
      ).toMatch(/^ok/);
    }
  });

  it('reports mastering state for request_mastering_final', () => {
    expect(
      syntheticToolResultContent(block('propose_mastering_action', 'request_mastering_final'), NONE),
    ).toMatch(/no mastered track/i);
    expect(
      syntheticToolResultContent(block('propose_mastering_action', 'request_mastering_final'), {
        ...NONE,
        hasCompletedMastering: true,
      }),
    ).toMatch(/^ok/);
  });
});

describe('textProposesPreview', () => {
  it('matches Hoo narrating a preview (so the route can auto-inject adjust_preview)', () => {
    for (const t of [
      'OK、この設定でプレビューを作るね。',
      'じゃあプレビューを生成するよ。',
      'プレビューを用意するね。',
      '新しいプレビューが生成されるから聴いてみて。',
      'Generating a preview now.',
      'A new preview is being generated.',
      // the hallucination must also match so a stuck session self-heals
      'プレビューは既に作成済みだよ。サイドバーで聴いてみてね。',
    ]) {
      expect(textProposesPreview(t)).toBe(true);
    }
  });

  it('does NOT match unrelated text or empty input', () => {
    for (const t of [
      'どんな雰囲気に仕上げたい？',
      'ボーカルをもう少し前に出すね。',
      'プレビューを聴いた感想を教えてね。', // "聴いた" is not make/generate
      '',
      null,
      undefined,
    ]) {
      expect(textProposesPreview(t as string)).toBe(false);
    }
  });
});

describe('syntheticToolResultContent — falls back to "ok" (strictly additive)', () => {
  it('returns ok for style-set, mastering param-set, unknown actions, and malformed blocks', () => {
    expect(syntheticToolResultContent(block('set_musical_style', undefined, { style: 'POP' }), NONE)).toBe('ok');
    expect(syntheticToolResultContent(block('propose_mastering_action', 'set_mastering_params'), NONE)).toBe('ok');
    expect(syntheticToolResultContent(block('propose_mix_action', 'unknown_action'), NONE)).toBe('ok');
    expect(syntheticToolResultContent(null, NONE)).toBe('ok');
    expect(syntheticToolResultContent({ id: 'x', name: 'propose_mix_action', input: null }, NONE)).toBe('ok');
    expect(syntheticToolResultContent({ id: 'x', name: 'propose_mix_action', input: 'oops' }, NONE)).toBe('ok');
  });
});
