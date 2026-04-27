import { describe, it, expect } from 'vitest';
import {
  detectFormat,
  extractMessages,
  filterMusicRelated,
  chunkMessages,
  CHUNK_SIZE,
} from '@/lib/utils/chat-import-parser';

// ─── detectFormat ────────────────────────────────────────────────────────────

describe('detectFormat', () => {
  it('detects ChatGPT format (mapping field)', () => {
    const data = [{ mapping: { node1: {} }, title: 'conv' }];
    expect(detectFormat(data)).toBe('chatgpt');
  });

  it('detects Claude format (uuid + chat_messages)', () => {
    const data = [{ uuid: 'abc', chat_messages: [] }];
    expect(detectFormat(data)).toBe('claude');
  });

  it('detects Claude format (name + messages)', () => {
    const data = [{ name: 'My conv', messages: [] }];
    expect(detectFormat(data)).toBe('claude');
  });

  it('returns unknown for empty array', () => {
    expect(detectFormat([])).toBe('unknown');
  });

  it('returns unknown for non-array', () => {
    expect(detectFormat({ mapping: {} })).toBe('unknown');
  });

  it('returns unknown for null', () => {
    expect(detectFormat(null)).toBe('unknown');
  });

  it('returns unknown for plain-object array', () => {
    const data = [{ id: 1, text: 'hello' }];
    expect(detectFormat(data)).toBe('unknown');
  });
});

// ─── extractMessages ─────────────────────────────────────────────────────────

describe('extractMessages — ChatGPT', () => {
  const makeChatGPTNode = (role: string, text: string) => ({
    message: {
      author: { role },
      content: { parts: [text] },
    },
  });

  it('extracts user messages from mapping', () => {
    const data = [
      {
        title: 'My Chat',
        mapping: {
          n1: makeChatGPTNode('user', 'How do I compress a drum bus?'),
          n2: makeChatGPTNode('assistant', 'Use a fast attack.'),
        },
      },
    ];
    const msgs = extractMessages(data, 'chatgpt');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('How do I compress a drum bus?');
    expect(msgs[0].conversationName).toBe('My Chat');
  });

  it('skips assistant messages', () => {
    const data = [
      {
        mapping: {
          n1: makeChatGPTNode('assistant', 'Here is how...'),
        },
      },
    ];
    expect(extractMessages(data, 'chatgpt')).toHaveLength(0);
  });

  it('skips empty text parts', () => {
    const data = [
      {
        mapping: {
          n1: { message: { author: { role: 'user' }, content: { parts: ['  '] } } },
        },
      },
    ];
    expect(extractMessages(data, 'chatgpt')).toHaveLength(0);
  });
});

describe('extractMessages — Claude', () => {
  it('extracts from chat_messages with sender=human', () => {
    const data = [
      {
        uuid: 'abc',
        name: 'Music Session',
        chat_messages: [
          { sender: 'human', text: 'Can you master this track?' },
          { sender: 'assistant', text: 'Sure!' },
        ],
      },
    ];
    const msgs = extractMessages(data, 'claude');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('Can you master this track?');
    expect(msgs[0].conversationName).toBe('Music Session');
  });

  it('extracts from messages with role=user', () => {
    const data = [
      {
        name: 'Session',
        messages: [
          { role: 'user', content: 'What BPM for lo-fi?' },
          { role: 'assistant', content: 'Around 75–90.' },
        ],
      },
    ];
    const msgs = extractMessages(data, 'claude');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('What BPM for lo-fi?');
  });

  it('extracts content from array-form content blocks', () => {
    const data = [
      {
        uuid: 'x',
        chat_messages: [
          { sender: 'human', content: [{ text: 'Help me with EQ.' }, { text: ' And reverb.' }] },
        ],
      },
    ];
    const msgs = extractMessages(data, 'claude');
    expect(msgs[0].text).toContain('Help me with EQ.');
  });
});

describe('extractMessages — unknown/fallback', () => {
  it('extracts via generic traversal when format is unknown', () => {
    const data = {
      nested: [
        { role: 'user', content: 'Generic user message' },
      ],
    };
    const msgs = extractMessages(data, 'unknown');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('Generic user message');
  });
});

// ─── filterMusicRelated ──────────────────────────────────────────────────────

describe('filterMusicRelated', () => {
  it('keeps messages containing English music keywords', () => {
    const msgs = [
      { role: 'user', text: 'How do I set the compressor ratio?' },
      { role: 'user', text: 'What is the weather today?' },
    ];
    const result = filterMusicRelated(msgs);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('compressor');
  });

  it('keeps messages containing Japanese music keywords', () => {
    const msgs = [
      { role: 'user', text: 'ミキシングのコツを教えてください' },
      { role: 'user', text: '今日の予定は何ですか' },
    ];
    const result = filterMusicRelated(msgs);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('ミキシング');
  });

  it('matches on conversationName even if text has no keyword', () => {
    const msgs = [
      { role: 'user', text: 'Yes please.', conversationName: 'Mixing advice' },
    ];
    expect(filterMusicRelated(msgs)).toHaveLength(1);
  });

  it('returns empty for non-music messages', () => {
    const msgs = [{ role: 'user', text: 'What is 2+2?' }];
    expect(filterMusicRelated(msgs)).toHaveLength(0);
  });
});

// ─── chunkMessages ───────────────────────────────────────────────────────────

describe('chunkMessages', () => {
  it('returns empty array for no input', () => {
    expect(chunkMessages([])).toEqual([]);
  });

  it('fits short messages into a single chunk', () => {
    const msgs = [{ text: 'Hello' }, { text: 'World' }];
    const chunks = chunkMessages(msgs);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('Hello');
    expect(chunks[0]).toContain('World');
  });

  it('splits when combined length exceeds CHUNK_SIZE', () => {
    const longText = 'x'.repeat(CHUNK_SIZE - 10);
    const msgs = [{ text: longText }, { text: 'second message' }];
    const chunks = chunkMessages(msgs);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('truncates a single message larger than CHUNK_SIZE', () => {
    const huge = 'y'.repeat(CHUNK_SIZE * 2);
    const chunks = chunkMessages([{ text: huge }]);
    expect(chunks[0].length).toBeLessThanOrEqual(CHUNK_SIZE);
  });

  it('trims whitespace from chunk boundaries', () => {
    const msgs = [{ text: '  hello  ' }];
    const chunks = chunkMessages(msgs);
    expect(chunks[0]).toBe('hello');
  });
});
