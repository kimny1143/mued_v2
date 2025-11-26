import { Metadata } from 'next';
import { ChatContainer } from '@/components/features/muednote/ChatContainer';

export const metadata: Metadata = {
  title: 'MUEDnote - 音楽学習ログ',
  description: 'AIが整形する音楽学習・制作の記録ノート',
};

/**
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
