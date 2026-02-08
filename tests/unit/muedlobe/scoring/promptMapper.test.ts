import { describe, it, expect } from 'vitest';
import { mapToPromptParams } from '@/lib/muedlobe/scoring/promptMapper';
import type { Scores } from '@/types/muedlobe';

function makeScores(overrides: Partial<Scores> = {}): Scores {
  return { wm: 50, ps: 50, vc: 50, pr: 50, att: 50, ...overrides };
}

describe('promptMapper', () => {
  describe('WM -> informationDensity, chunkSize', () => {
    it('maps low WM to low/small', () => {
      const { promptParams } = mapToPromptParams(makeScores({ wm: 20 }), []);
      expect(promptParams.informationDensity).toBe('low');
      expect(promptParams.chunkSize).toBe('small');
    });

    it('maps medium WM to medium/medium', () => {
      const { promptParams } = mapToPromptParams(makeScores({ wm: 50 }), []);
      expect(promptParams.informationDensity).toBe('medium');
      expect(promptParams.chunkSize).toBe('medium');
    });

    it('maps high WM to high/large', () => {
      const { promptParams } = mapToPromptParams(makeScores({ wm: 80 }), []);
      expect(promptParams.informationDensity).toBe('high');
      expect(promptParams.chunkSize).toBe('large');
    });
  });

  describe('PS -> pacing, confirmationFrequency', () => {
    it('maps low PS to slow/frequent', () => {
      const { promptParams } = mapToPromptParams(makeScores({ ps: 20 }), []);
      expect(promptParams.pacing).toBe('slow');
      expect(promptParams.confirmationFrequency).toBe('frequent');
    });

    it('maps high PS to fast/minimal', () => {
      const { promptParams } = mapToPromptParams(makeScores({ ps: 80 }), []);
      expect(promptParams.pacing).toBe('fast');
      expect(promptParams.confirmationFrequency).toBe('minimal');
    });
  });

  describe('VC-PR -> modality', () => {
    it('maps large negative diff to visual', () => {
      const { promptParams } = mapToPromptParams(makeScores({ vc: 20, pr: 80 }), []);
      expect(promptParams.modality).toBe('visual');
    });

    it('maps large positive diff to verbal', () => {
      const { promptParams } = mapToPromptParams(makeScores({ vc: 80, pr: 20 }), []);
      expect(promptParams.modality).toBe('verbal');
    });

    it('maps small diff to balanced', () => {
      const { promptParams } = mapToPromptParams(makeScores({ vc: 50, pr: 50 }), []);
      expect(promptParams.modality).toBe('balanced');
    });

    it('is balanced at threshold boundary (diff = -30)', () => {
      const { promptParams } = mapToPromptParams(makeScores({ vc: 20, pr: 50 }), []);
      expect(promptParams.modality).toBe('balanced');
    });

    it('is visual past threshold (diff = -31)', () => {
      const { promptParams } = mapToPromptParams(makeScores({ vc: 19, pr: 50 }), []);
      expect(promptParams.modality).toBe('visual');
    });
  });

  describe('PR -> abstractionLevel', () => {
    it('maps low PR to concrete', () => {
      const { promptParams } = mapToPromptParams(makeScores({ pr: 20 }), []);
      expect(promptParams.abstractionLevel).toBe('concrete');
    });

    it('maps high PR to abstract', () => {
      const { promptParams } = mapToPromptParams(makeScores({ pr: 80 }), []);
      expect(promptParams.abstractionLevel).toBe('abstract');
    });
  });

  describe('ATT -> responseLength', () => {
    it('maps low ATT to short', () => {
      const { promptParams } = mapToPromptParams(makeScores({ att: 20 }), []);
      expect(promptParams.responseLength).toBe('short');
    });

    it('maps high ATT to flexible', () => {
      const { promptParams } = mapToPromptParams(makeScores({ att: 80 }), []);
      expect(promptParams.responseLength).toBe('flexible');
    });
  });

  describe('special instructions', () => {
    it('generates instructions for detected patterns', () => {
      const { specialInstructions } = mapToPromptParams(
        makeScores(),
        ['architect_type', 'high_attention_modifier']
      );

      expect(specialInstructions).toHaveLength(2);
      expect(specialInstructions[0]).toContain('Architect profile');
      expect(specialInstructions[1]).toContain('Strong sustained attention');
    });

    it('returns empty array for no patterns', () => {
      const { specialInstructions } = mapToPromptParams(makeScores(), []);
      expect(specialInstructions).toHaveLength(0);
    });

    it('maps all 19 patterns to non-empty instructions', () => {
      const allPatterns = [
        'high_wm_low_ps', 'low_wm_high_ps',
        'high_wm_low_vc', 'low_wm_high_vc',
        'high_wm_low_pr', 'low_wm_high_pr',
        'high_ps_low_vc', 'low_ps_high_vc',
        'high_ps_low_pr', 'low_ps_high_pr',
        'high_vc_low_pr', 'low_vc_high_pr',
        'architect_type', 'performer_type', 'theorist_type', 'visualizer_type', 'balanced_type',
        'low_attention_modifier', 'high_attention_modifier',
      ] as const;

      const { specialInstructions } = mapToPromptParams(makeScores(), [...allPatterns]);
      expect(specialInstructions).toHaveLength(19);
      specialInstructions.forEach((inst) => {
        expect(inst.length).toBeGreaterThan(10);
      });
    });
  });

  describe('tier boundaries', () => {
    it('treats 35 as low tier', () => {
      const { promptParams } = mapToPromptParams(makeScores({ wm: 35 }), []);
      expect(promptParams.informationDensity).toBe('low');
    });

    it('treats 36 as medium tier', () => {
      const { promptParams } = mapToPromptParams(makeScores({ wm: 36 }), []);
      expect(promptParams.informationDensity).toBe('medium');
    });

    it('treats 65 as medium tier', () => {
      const { promptParams } = mapToPromptParams(makeScores({ wm: 65 }), []);
      expect(promptParams.informationDensity).toBe('medium');
    });

    it('treats 66 as high tier', () => {
      const { promptParams } = mapToPromptParams(makeScores({ wm: 66 }), []);
      expect(promptParams.informationDensity).toBe('high');
    });
  });
});
