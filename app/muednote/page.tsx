import { Metadata } from 'next';
import { ChatContainer } from '@/components/features/muednote/ChatContainer';

export const metadata: Metadata = {
  title: 'MUEDnote - 音楽学習ログ',
  description: 'AIが整形する音楽学習・制作の記録ノート',
};

/**
 * @deprecated This implementation is part of MUEDnote v2.x and will be replaced in v3.0.
 * See `/docs/architecture/muednote-v2-to-v3-migration-plan.md` for migration details.
 *
 * v3.0 will use:
 * - Tauri desktop app (instead of Next.js web)
 * - Silent Console UX (instead of Chat UI)
 * - Fragment/Context model (instead of Session/Interview)
 *
 * Expected migration: Q2 2025
 *
 * ---
 *
 * MUEDnote メインページ
 *
 * UX心理学の原則:
 * - 認知負荷削減: チャット一枚のシンプルなUI
 * - 美的ユーザビリティ効果: Shadcn/UIによる洗練されたデザイン
 * - 段階的開示: 高度な機能は必要時のみ表示
 */
export default function MUEDnotePage() {
  return (
    <div className="container mx-auto h-screen flex flex-col p-4">
      {/* ヘッダー */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">MUEDnote</h1>
        <p className="text-sm text-muted-foreground">
          今日の音楽活動を記録しましょう。AIが整理します。
        </p>
      </header>

      {/* チャットコンテナ - メインUI */}
      <ChatContainer />
    </div>
  );
}
