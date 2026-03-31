/**
 * Chat Import Parser — Shared utilities for parsing AI conversation exports
 *
 * Supports Claude, ChatGPT, and Gemini export formats.
 * Used by both MUEDnote and MUEDial import pages.
 */

// ========================================
// Constants
// ========================================

export const MUSIC_KEYWORDS = [
  // English
  'mix', 'master', 'eq', 'compress', 'reverb', 'delay', 'guitar', 'bass', 'drum',
  'vocal', 'synth', 'piano', 'chord', 'melody', 'harmony', 'arrangement', 'production',
  'daw', 'ableton', 'logic', 'cubase', 'pro tools', 'fl studio', 'plugin', 'vst',
  'frequency', 'gain', 'stereo', 'mono', 'panning', 'sidechain', 'limiter',
  'tempo', 'bpm', 'beat', 'groove', 'rhythm', 'song', 'track', 'album',
  'genre', 'rock', 'pop', 'jazz', 'hip hop', 'electronic', 'classical', 'metal',
  'indie', 'r&b', 'funk', 'soul', 'ambient', 'lo-fi',
  // Japanese
  '作曲', '編曲', 'ミキシング', 'マスタリング', 'ミックス', '音楽', '曲', '楽曲',
  '楽器', 'ギター', 'ベース', 'ドラム', 'ピアノ', 'シンセ', 'ボーカル',
  'コード', 'メロディ', 'ハーモニー', 'アレンジ', '制作', 'プロダクション',
  '音圧', '音像', '空間', 'リバーブ', 'ディレイ', 'コンプ', 'イコライザー',
  'テンポ', 'リズム', 'グルーブ', 'ビート',
];

export const CHUNK_SIZE = 9000;
export const MAX_CONCURRENT = 3;

// ========================================
// Types
// ========================================

export type FileFormat = 'claude' | 'chatgpt' | 'gemini' | 'unknown';

export interface ChatMessage {
  role: string;
  text: string;
  conversationName?: string;
}

// ========================================
// Parsers
// ========================================

export function detectFormat(data: unknown): FileFormat {
  if (Array.isArray(data)) {
    const first = data[0];
    if (first?.mapping) return 'chatgpt';
    if (first?.uuid && first?.chat_messages) return 'claude';
    if (first?.name && first?.messages) return 'claude';
  }
  return 'unknown';
}

export function extractMessages(data: unknown, format: FileFormat): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (format === 'chatgpt' && Array.isArray(data)) {
    for (const conv of data) {
      const name = conv.title || conv.name || '';
      const mapping = conv.mapping;
      if (mapping && typeof mapping === 'object') {
        for (const node of Object.values(mapping) as { message?: { author?: { role?: string }; content?: { parts?: string[] } } }[]) {
          const msg = node?.message;
          if (msg?.author?.role === 'user' && msg?.content?.parts) {
            const text = msg.content.parts.filter((p: unknown) => typeof p === 'string').join('\n');
            if (text.trim()) messages.push({ role: 'user', text, conversationName: name });
          }
        }
      }
    }
  } else if (format === 'claude' && Array.isArray(data)) {
    for (const conv of data) {
      const name = conv.name || conv.title || '';
      const chatMessages = conv.chat_messages || conv.messages || [];
      for (const msg of chatMessages) {
        if (msg.sender === 'human' || msg.role === 'user') {
          const text = typeof msg.text === 'string' ? msg.text
            : typeof msg.content === 'string' ? msg.content
            : Array.isArray(msg.content) ? msg.content.filter((c: unknown) => typeof c === 'string' || (typeof c === 'object' && c !== null && 'text' in c)).map((c: unknown) => typeof c === 'string' ? c : (c as { text: string }).text).join('\n')
            : '';
          if (text.trim()) messages.push({ role: 'user', text, conversationName: name });
        }
      }
    }
  } else {
    const tryExtract = (obj: unknown): void => {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (item?.role === 'user' && typeof item?.content === 'string') {
            messages.push({ role: 'user', text: item.content });
          }
          tryExtract(item);
        }
      } else if (obj && typeof obj === 'object') {
        for (const val of Object.values(obj)) {
          tryExtract(val);
        }
      }
    };
    tryExtract(data);
  }

  return messages;
}

export function filterMusicRelated(messages: ChatMessage[]): ChatMessage[] {
  const keywordRegex = new RegExp(MUSIC_KEYWORDS.join('|'), 'i');
  return messages.filter(m => keywordRegex.test(m.text) || (m.conversationName && keywordRegex.test(m.conversationName)));
}

export function chunkMessages(messages: { text: string }[]): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const msg of messages) {
    const entry = msg.text + '\n\n';
    if (current.length + entry.length > CHUNK_SIZE) {
      if (current.trim()) chunks.push(current.trim());
      current = entry.length > CHUNK_SIZE ? entry.slice(0, CHUNK_SIZE) : entry;
    } else {
      current += entry;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}
