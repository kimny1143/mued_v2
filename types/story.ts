/**
 * Story Article Types
 *
 * 開発ストーリー記事のコンテンツブロック型定義
 */

export interface DialogueBlock {
  type: "dialogue";
  speaker: "claude" | "kimny";
  text: string;
}

export interface HeadingBlock {
  type: "heading";
  text: string;
}

export interface MetaBlock {
  type: "meta";
  text: string;
}

export interface DividerBlock {
  type: "divider";
}

export interface PullQuoteBlock {
  type: "pullquote";
  text: string;
  speaker?: "claude" | "kimny";
}

export interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}

export type SectionBlock =
  | DialogueBlock
  | HeadingBlock
  | MetaBlock
  | DividerBlock
  | PullQuoteBlock
  | TableBlock;
