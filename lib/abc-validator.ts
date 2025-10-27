/**
 * ABC Validator
 *
 * ABC記法の構文検証とブロック抽出
 */

import abcjs, { type TuneObject, type AbcElem } from 'abcjs';

export interface AbcBlock {
  id: string;
  title: string;
  abc: string;
}

/**
 * ABC記法の構文検証
 */
export function validateAbcSyntax(abc: string): string | null {
  if (!abc || abc.trim().length === 0) {
    return 'ABC記法が空です';
  }

  try {
    const parseResult = abcjs.parseOnly(abc);

    // パースエラーチェック
    if (!parseResult || !Array.isArray(parseResult) || parseResult.length < 1) {
      return 'ABC記法のパースに失敗しました';
    }

    const firstTune = parseResult[0];

    // エラーメッセージの確認（anyを使って型エラーを回避）
    if ((firstTune as any).error) {
      return `構文エラー: ${(firstTune as any).error}`;
    }

    // スタッフ（五線）の存在確認
    if (firstTune.lines && Array.isArray(firstTune.lines) && firstTune.lines.length > 0) {
      return null; // 正常
    }

    return 'ABC記法の構造が不正です（五線が見つかりません）';
  } catch (error) {
    return `構文エラー: ${error instanceof Error ? error.message : '不明なエラー'}`;
  }
}

/**
 * Markdownコンテンツから ABC記法ブロックを抽出
 */
export function extractAbcBlocks(content: string): AbcBlock[] {
  const abcRegex = /```abc\n([\s\S]*?)```/g;
  const blocks: AbcBlock[] = [];
  let match;

  while ((match = abcRegex.exec(content)) !== null) {
    const abc = match[1].trim();

    // タイトル行を抽出（T: で始まる行）
    const titleMatch = abc.match(/^T:(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `楽譜 ${blocks.length + 1}`;

    blocks.push({
      id: `abc_${blocks.length + 1}`,
      title,
      abc,
    });
  }

  return blocks;
}

/**
 * ABC記法から基本情報を抽出
 */
export function extractAbcMetadata(abc: string): {
  title?: string;
  composer?: string;
  meter?: string; // 拍子
  tempo?: number; // BPM
  key?: string; // 調
  length?: string; // デフォルト音符長
} {
  const metadata: ReturnType<typeof extractAbcMetadata> = {};

  const lines = abc.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // タイトル (T:)
    if (trimmed.startsWith('T:')) {
      metadata.title = trimmed.substring(2).trim();
    }

    // 作曲者 (C:)
    if (trimmed.startsWith('C:')) {
      metadata.composer = trimmed.substring(2).trim();
    }

    // 拍子 (M:)
    if (trimmed.startsWith('M:')) {
      metadata.meter = trimmed.substring(2).trim();
    }

    // テンポ (Q:)
    if (trimmed.startsWith('Q:')) {
      const tempoMatch = trimmed.match(/Q:\s*\d+\/\d+=(\d+)/);
      if (tempoMatch) {
        metadata.tempo = parseInt(tempoMatch[1], 10);
      }
    }

    // 調 (K:)
    if (trimmed.startsWith('K:')) {
      metadata.key = trimmed.substring(2).trim();
    }

    // デフォルト音符長 (L:)
    if (trimmed.startsWith('L:')) {
      metadata.length = trimmed.substring(2).trim();
    }
  }

  return metadata;
}

/**
 * ABC記法が最低限の必須ヘッダーを持っているか確認
 */
export function hasRequiredHeaders(abc: string): { valid: boolean; missing: string[] } {
  const required = ['X:', 'T:', 'M:', 'L:', 'K:'];
  const missing: string[] = [];

  for (const header of required) {
    if (!abc.includes(header)) {
      missing.push(header.replace(':', ''));
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * ABC記法を整形（インデントとスペーシング）
 */
export function formatAbc(abc: string): string {
  const lines = abc.split('\n');
  const formatted: string[] = [];

  let inHeader = true;

  for (const line of lines) {
    const trimmed = line.trim();

    // 空行はそのまま
    if (trimmed.length === 0) {
      formatted.push('');
      continue;
    }

    // ヘッダー行（X:, T:, M:, L:, K: など）
    if (/^[A-Z]:/.test(trimmed)) {
      formatted.push(trimmed);

      // K: で始まる行の後はヘッダー終了
      if (trimmed.startsWith('K:')) {
        inHeader = false;
        formatted.push(''); // ヘッダーと本体の間に空行
      }
      continue;
    }

    // 本体（音符行）
    if (!inHeader) {
      formatted.push(trimmed);
    }
  }

  return formatted.join('\n');
}

/**
 * タイトルを抽出（Markdownのh1またはABCのT:）
 */
export function extractTitle(content: string): string {
  // Markdownのh1を探す
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // ABC記法のT:を探す
  const abcBlocks = extractAbcBlocks(content);
  if (abcBlocks.length > 0) {
    return abcBlocks[0].title;
  }

  // どちらもなければデフォルト
  return 'Untitled Material';
}
