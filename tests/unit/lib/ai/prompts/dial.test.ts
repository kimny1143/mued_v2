import { describe, it, expect } from 'vitest';
import {
  buildDialSystemPrompt,
  DIAL_PROMPT_VERSION,
  DIAL_MIX_ACTION_TOOL,
  DIAL_OMAKASE_MIX_ACTION_TOOL,
  DIAL_MASTERING_ACTION_TOOL,
  DIAL_SET_STYLE_TOOL,
  type DialPromptInput,
} from '@/lib/ai/prompts/dial';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<DialPromptInput> = {}): DialPromptInput {
  return {
    mode: 'dialogue',
    previewCount: 0,
    previewLimit: 0,
    musicalStyle: 'rock',
    tracks: [
      { filename: 'vocal.wav', instrumentGroup: 'VOCAL', presenceSetting: 'LEAD', panPreference: 'CENTRE', reverbPreference: 'LOW' },
      { filename: 'drums.wav', instrumentGroup: 'DRUMS', presenceSetting: 'NORMAL', panPreference: 'NO_PREFERENCE', reverbPreference: 'LOW' },
    ],
    hasPreview: false,
    phase: 1,
    mixCheckCount: 0,
    paidCycleCount: 0,
    baseCycleLimit: 5,
    additionalCyclesPurchased: 0,
    additionalCycleLimit: 5,
    masteringMode: null,
    isMasteringPhase: false,
    masteringPreviewCount: 0,
    hasMasteringPreview: false,
    ...overrides,
  };
}

// ─── Version ────────────────────────────────────────────────────────────────

describe('DIAL_PROMPT_VERSION', () => {
  it('exports a version string', () => {
    expect(DIAL_PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ─── Tool Definitions ───────────────────────────────────────────────────────

describe('Tool definitions', () => {
  it('DIAL_MIX_ACTION_TOOL has correct actions', () => {
    const actions = DIAL_MIX_ACTION_TOOL.input_schema.properties.action.enum;
    expect(actions).toContain('adjust_preview');
    expect(actions).toContain('request_mix_check');
    expect(actions).toContain('request_final');
  });

  it('DIAL_OMAKASE_MIX_ACTION_TOOL has no request_mix_check', () => {
    const actions = DIAL_OMAKASE_MIX_ACTION_TOOL.input_schema.properties.action.enum;
    expect(actions).toContain('adjust_preview');
    expect(actions).toContain('request_final');
    expect(actions).not.toContain('request_mix_check');
  });

  it('DIAL_MASTERING_ACTION_TOOL has mastering actions', () => {
    const actions = DIAL_MASTERING_ACTION_TOOL.input_schema.properties.action.enum;
    expect(actions).toContain('set_mastering_params');
    expect(actions).toContain('request_mastering_final');
  });

  it('DIAL_SET_STYLE_TOOL has valid style enum', () => {
    const styles = DIAL_SET_STYLE_TOOL.input_schema.properties.style.enum;
    expect(styles).toContain('POP');
    expect(styles).toContain('ROCK_INDIE');
    expect(styles).toContain('METAL');
    expect(styles).toContain('OTHER');
  });
});

// ─── buildDialSystemPrompt ──────────────────────────────────────────────────

describe('buildDialSystemPrompt', () => {
  describe('Mode routing', () => {
    it('returns dialogue prompt for dialogue mode', () => {
      const prompt = buildDialSystemPrompt(makeInput({ mode: 'dialogue' }));
      expect(prompt).toContain('Hoo');
      expect(prompt).toContain('ミキシングアシスタント');
      expect(prompt).toContain('3段階ミキシングフロー');
    });

    it('returns omakase prompt for omakase mode', () => {
      const prompt = buildDialSystemPrompt(makeInput({ mode: 'omakase', previewLimit: 5 }));
      expect(prompt).toContain('おまかせミックス');
      expect(prompt).not.toContain('3段階ミキシングフロー');
    });

    it('returns mastering prompt when isMasteringPhase is true', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        isMasteringPhase: true,
        masteringMode: 'dialogue',
      }));
      expect(prompt).toContain('マスタリングアシスタント');
    });

    it('mastering phase takes precedence over mode', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        mode: 'dialogue',
        isMasteringPhase: true,
        masteringMode: 'dialogue',
      }));
      expect(prompt).toContain('マスタリングアシスタント');
      expect(prompt).not.toContain('3段階ミキシングフロー');
    });
  });

  describe('Session context', () => {
    it('includes track list in prompt', () => {
      const prompt = buildDialSystemPrompt(makeInput());
      expect(prompt).toContain('vocal.wav');
      expect(prompt).toContain('drums.wav');
    });

    it('includes musical style', () => {
      const prompt = buildDialSystemPrompt(makeInput({ musicalStyle: 'pop' }));
      expect(prompt).toContain('MusicalStyle: pop');
    });

    it('indicates first-time session (no preview)', () => {
      const prompt = buildDialSystemPrompt(makeInput({ hasPreview: false }));
      expect(prompt).toContain('初回');
    });

    it('indicates current phase', () => {
      const prompt = buildDialSystemPrompt(makeInput({ hasPreview: true, phase: 2, mixCheckCount: 0 }));
      expect(prompt).toContain('Phase: 2');
      expect(prompt).toContain('Mix Check');
    });
  });

  describe('Retake control', () => {
    it('shows retake info for phase 2+', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        hasPreview: true,
        phase: 2,
        paidCycleCount: 2,
        baseCycleLimit: 5,
      }));
      expect(prompt).toContain('リテイク状況');
      expect(prompt).toContain('2/5回');
    });

    it('shows last-cycle warning when remaining=1', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        hasPreview: true,
        phase: 2,
        paidCycleCount: 4,
        baseCycleLimit: 5,
      }));
      expect(prompt).toContain('最後の調整');
    });

    it('shows cycle-limit warning when remaining=0', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        hasPreview: true,
        phase: 2,
        paidCycleCount: 5,
        baseCycleLimit: 5,
      }));
      expect(prompt).toContain('サイクル上限到達');
    });

    it('shows engineer referral hint after 3+ additional cycles', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        hasPreview: true,
        phase: 2,
        paidCycleCount: 8,
        baseCycleLimit: 5,
        additionalCyclesPurchased: 3,
      }));
      expect(prompt).toContain('エンジニア斡旋');
    });

    it('does not show retake info for phase 1', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        hasPreview: true,
        phase: 1,
        paidCycleCount: 0,
      }));
      expect(prompt).not.toContain('リテイク状況');
    });
  });

  describe('Omakase-specific', () => {
    it('shows preview remaining count', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        mode: 'omakase',
        previewLimit: 5,
        previewCount: 3,
      }));
      expect(prompt).toContain('残り2回');
    });

    it('warns when preview limit reached', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        mode: 'omakase',
        previewLimit: 5,
        previewCount: 5,
      }));
      expect(prompt).toContain('上限到達');
    });
  });

  describe('Mastering-specific', () => {
    it('includes analysis result when available', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        isMasteringPhase: true,
        masteringMode: 'dialogue',
        analysisResult: {
          loudnessLufs: -18.2,
          peakDbfs: -1.3,
          stereoField: 'wide',
          monoCompatible: true,
          clipping: false,
          tonalProfile: { low: 0.3, mid: 0.45, high: 0.25 },
        },
      }));
      expect(prompt).toContain('-18.2 LUFS');
      expect(prompt).toContain('-1.3 dBFS');
    });

    it('omits dynamic analysis data when no analysis', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        isMasteringPhase: true,
        masteringMode: 'dialogue',
      }));
      // The static "分析データの活用" instructions are always present,
      // but the dynamic "元音源の分析結果" section with actual LUFS values should be absent
      expect(prompt).not.toContain('元音源の分析結果');
      expect(prompt).not.toContain('LUFS\n');
    });
  });

  describe('Core prompt rules', () => {
    it('dialogue prompt contains feedback collection rules', () => {
      const prompt = buildDialSystemPrompt(makeInput());
      expect(prompt).toContain('フィードバック収集の鉄則');
    });

    it('dialogue prompt forbids technical jargon', () => {
      const prompt = buildDialSystemPrompt(makeInput());
      expect(prompt).toContain('技術用語を');
      expect(prompt).toContain('一切使わない');
    });

    it('dialogue prompt requires tool use (no JSON in text)', () => {
      const prompt = buildDialSystemPrompt(makeInput());
      expect(prompt).toContain('テキストにJSONを含めない');
    });

    it('mastering prompt explains LUFS reference values', () => {
      const prompt = buildDialSystemPrompt(makeInput({
        isMasteringPhase: true,
        masteringMode: 'dialogue',
      }));
      expect(prompt).toContain('LUFS');
      expect(prompt).toContain('-14');
    });
  });
});
