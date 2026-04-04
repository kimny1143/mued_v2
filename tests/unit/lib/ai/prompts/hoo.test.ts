/**
 * Hoo Prompt Builder Unit Tests
 *
 * Tests prompt construction functions — all pure functions, no DB dependency.
 */

import { describe, it, expect } from 'vitest';
import {
  getHooSystemPrompt,
  getHooCorePrompt,
  getHooExtendedPrompt,
  getHooSystemPromptWithContext,
  buildSessionContextPrompt,
  buildCustomInstructionsPrompt,
  buildMuedlobeInstructionsPrompt,
  buildLobeContextPrompt,
  getHooSystemPromptWithMemory,
  HOO_PROMPT_VERSION,
  type SessionContextForHoo,
} from '@/lib/ai/prompts/hoo';

// ========================================
// Base Prompt Tests
// ========================================

describe('Base prompt functions', () => {
  it('getHooCorePrompt returns core character prompt', () => {
    const prompt = getHooCorePrompt();
    expect(prompt).toContain('Hoo');
    expect(prompt).toContain('フクロウ');
    expect(prompt).toContain('会話スタイル');
    expect(prompt).toContain('ほほう');
  });

  it('getHooExtendedPrompt returns extended techniques', () => {
    const prompt = getHooExtendedPrompt();
    expect(prompt).toContain('深掘りの技法');
    expect(prompt).toContain('思考を引き出す');
    expect(prompt).toContain('論点を整理する');
    expect(prompt).toContain('相手の専門領域への敬意');
  });

  it('getHooSystemPrompt combines core + extended with separator', () => {
    const prompt = getHooSystemPrompt();
    const core = getHooCorePrompt();
    const extended = getHooExtendedPrompt();

    expect(prompt).toContain(core);
    expect(prompt).toContain(extended);
    expect(prompt).toContain('---');
  });

  it('exports prompt version', () => {
    expect(HOO_PROMPT_VERSION).toBe('1.1.0');
  });
});

// ========================================
// Session Context Tests
// ========================================

describe('buildSessionContextPrompt', () => {
  it('returns empty string when hasContext is false', () => {
    const context: SessionContextForHoo = {
      hasContext: false,
      recentSessions: [],
    };

    expect(buildSessionContextPrompt(context)).toBe('');
  });

  it('returns empty string when no sessions', () => {
    const context: SessionContextForHoo = {
      hasContext: true,
      recentSessions: [],
    };

    expect(buildSessionContextPrompt(context)).toBe('');
  });

  it('formats session with title and date', () => {
    const context: SessionContextForHoo = {
      hasContext: true,
      recentSessions: [
        {
          id: 's1',
          title: 'Mix Session',
          type: 'mobile_session',
          createdAt: '2026-03-15T10:00:00.000Z',
        },
      ],
    };

    const result = buildSessionContextPrompt(context);
    expect(result).toContain('Mix Session');
    expect(result).toContain('3/15');
    expect(result).toContain('ユーザーの制作コンテキスト');
  });

  it('includes analysis focus area with Japanese label', () => {
    const context: SessionContextForHoo = {
      hasContext: true,
      recentSessions: [
        {
          id: 's1',
          title: 'Test Session',
          type: 'interview',
          createdAt: '2026-03-20T00:00:00.000Z',
          analysis: {
            focusArea: 'harmony',
            intentHypothesis: 'コード進行の改善',
            confidence: 0.8,
          },
        },
      ],
    };

    const result = buildSessionContextPrompt(context);
    expect(result).toContain('和声・コード進行');
    expect(result).toContain('コード進行の改善');
  });

  it('includes Q&A pairs', () => {
    const context: SessionContextForHoo = {
      hasContext: true,
      recentSessions: [
        {
          id: 's1',
          title: 'Recording',
          type: 'mobile_session',
          createdAt: '2026-03-25T00:00:00.000Z',
          qaPairs: [
            { question: 'ギターのトーンについて', answer: '太めにしたい' },
          ],
        },
      ],
    };

    const result = buildSessionContextPrompt(context);
    expect(result).toContain('ギターのトーンについて');
    expect(result).toContain('太めにしたい');
  });
});

describe('getHooSystemPromptWithContext', () => {
  it('returns base prompt when no context', () => {
    const base = getHooSystemPrompt();
    const result = getHooSystemPromptWithContext();
    expect(result).toBe(base);
  });

  it('returns base prompt when context has no data', () => {
    const base = getHooSystemPrompt();
    const result = getHooSystemPromptWithContext({
      hasContext: false,
      recentSessions: [],
    });
    expect(result).toBe(base);
  });

  it('appends context when available', () => {
    const result = getHooSystemPromptWithContext({
      hasContext: true,
      recentSessions: [
        {
          id: 's1',
          title: 'Test',
          type: 'mobile_session',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(result).toContain('ユーザーの制作コンテキスト');
  });
});

// ========================================
// Custom Instructions Tests
// ========================================

describe('buildCustomInstructionsPrompt', () => {
  it('wraps instructions in proper format', () => {
    const result = buildCustomInstructionsPrompt('短めに話して');
    expect(result).toContain('ユーザーのカスタム指示');
    expect(result).toContain('短めに話して');
    expect(result).toContain('---');
  });
});

// ========================================
// MUEDlobe Instructions Tests
// ========================================

describe('buildMuedlobeInstructionsPrompt', () => {
  it('formats instructions as bullet list', () => {
    const instructions = [
      '視覚的な説明を多用する',
      '短い文で区切る',
    ];

    const result = buildMuedlobeInstructionsPrompt(instructions);
    expect(result).toContain('MUEDlobe 認知プロファイル');
    expect(result).toContain('- 視覚的な説明を多用する');
    expect(result).toContain('- 短い文で区切る');
  });
});

// ========================================
// Lobe Context Tests
// ========================================

describe('buildLobeContextPrompt', () => {
  const scores = { wm: 75, ps: 60, vc: 85, pr: 35, att: 70 };

  it('includes all 5 dimension scores', () => {
    const result = buildLobeContextPrompt(scores, []);
    expect(result).toContain('75/100');
    expect(result).toContain('60/100');
    expect(result).toContain('85/100');
    expect(result).toContain('35/100');
    expect(result).toContain('70/100');
  });

  it('labels score tiers correctly', () => {
    const result = buildLobeContextPrompt(scores, []);
    expect(result).toContain('高め'); // 75, 85, 70
    expect(result).toContain('標準的'); // 60
    expect(result).toContain('伸びしろあり'); // 35 (< 40)
  });

  it('uses Japanese dimension names', () => {
    const result = buildLobeContextPrompt(scores, []);
    expect(result).toContain('ワーキングメモリ');
    expect(result).toContain('処理速度');
    expect(result).toContain('言語理解');
    expect(result).toContain('知覚推理');
    expect(result).toContain('注意力');
  });

  it('includes patterns when provided', () => {
    const result = buildLobeContextPrompt(scores, ['high-verbal', 'balanced-attention']);
    expect(result).toContain('特徴的なパターン');
    expect(result).toContain('high-verbal');
    expect(result).toContain('balanced-attention');
  });

  it('omits patterns section when empty', () => {
    const result = buildLobeContextPrompt(scores, []);
    expect(result).not.toContain('特徴的なパターン');
  });

  it('includes Hoo behavioral guidance', () => {
    const result = buildLobeContextPrompt(scores, []);
    expect(result).toContain('Hooの振る舞い');
    expect(result).toContain('認知特性に優劣はない');
  });
});

// ========================================
// Full Prompt Assembly Tests
// ========================================

describe('getHooSystemPromptWithMemory', () => {
  it('returns base prompt when no extras', () => {
    const base = getHooSystemPrompt();
    const result = getHooSystemPromptWithMemory();
    expect(result).toBe(base);
  });

  it('appends custom instructions', () => {
    const result = getHooSystemPromptWithMemory('マイペースで');
    expect(result).toContain('ユーザーのカスタム指示');
    expect(result).toContain('マイペースで');
  });

  it('skips empty custom instructions', () => {
    const base = getHooSystemPrompt();
    const result = getHooSystemPromptWithMemory('  ');
    expect(result).toBe(base);
  });

  it('skips null custom instructions', () => {
    const base = getHooSystemPrompt();
    const result = getHooSystemPromptWithMemory(null);
    expect(result).toBe(base);
  });

  it('appends MUEDlobe instructions', () => {
    const result = getHooSystemPromptWithMemory(null, undefined, ['視覚的に']);
    expect(result).toContain('MUEDlobe 認知プロファイル');
  });

  it('appends auto-memories', () => {
    const memories = [
      { content: 'Logic Pro使用', category: 'equipment' },
      { content: 'アンビエント好み', category: 'genre' },
    ];

    const result = getHooSystemPromptWithMemory(null, undefined, null, memories);
    expect(result).toContain('ユーザーについて学んだこと');
    expect(result).toContain('Logic Pro使用');
    expect(result).toContain('アンビエント好み');
    expect(result).toContain('equipment');
    expect(result).toContain('genre');
  });

  it('appends session context', () => {
    const context: SessionContextForHoo = {
      hasContext: true,
      recentSessions: [
        {
          id: 's1',
          title: 'Test',
          type: 'mobile_session',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = getHooSystemPromptWithMemory(null, context);
    expect(result).toContain('ユーザーの制作コンテキスト');
  });

  it('assembles all layers in correct order', () => {
    const context: SessionContextForHoo = {
      hasContext: true,
      recentSessions: [
        {
          id: 's1',
          title: 'Session',
          type: 'mobile_session',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    const memories = [{ content: 'Test', category: 'skill' }];

    const result = getHooSystemPromptWithMemory(
      '短く話して',
      context,
      ['視覚的に'],
      memories
    );

    // Verify ordering: core → extended → custom → muedlobe → memories → context
    const customIdx = result.indexOf('ユーザーのカスタム指示');
    const muedlobeIdx = result.indexOf('MUEDlobe 認知プロファイル');
    const memoryIdx = result.indexOf('ユーザーについて学んだこと');
    const contextIdx = result.indexOf('ユーザーの制作コンテキスト');

    expect(customIdx).toBeGreaterThan(0);
    expect(muedlobeIdx).toBeGreaterThan(customIdx);
    expect(memoryIdx).toBeGreaterThan(muedlobeIdx);
    expect(contextIdx).toBeGreaterThan(memoryIdx);
  });

  it('separates sections with ---', () => {
    const result = getHooSystemPromptWithMemory('指示', undefined, ['テスト']);
    const parts = result.split('---');
    // At minimum: core | extended | custom instructions | muedlobe = 4+ parts
    expect(parts.length).toBeGreaterThanOrEqual(4);
  });
});
