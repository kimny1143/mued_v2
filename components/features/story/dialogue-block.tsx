import type { DialogueBlock as DialogueBlockType } from "@/types/story";

interface DialogueBlockProps {
  block: DialogueBlockType;
}

/**
 * Dialogue Block Component - Editorial Style
 *
 * 雑誌インタビュー形式の対話表示。
 * - Claude（質問者）: 太字、小さめ、質問らしいスタイル
 * - kimny（回答者）: 通常テキスト、余白でリズムを作る
 */
export function DialogueBlock({ block }: DialogueBlockProps) {
  const isClaude = block.speaker === "claude";

  if (isClaude) {
    // 質問者（Claude）: インタビュアースタイル
    return (
      <div className="mt-8 mb-3">
        <p className="text-white/50 text-sm font-medium leading-relaxed">
          {block.text}
        </p>
      </div>
    );
  }

  // 回答者（kimny）: インタビュイースタイル
  return (
    <div className="mb-5">
      <p className="text-white/90 text-[15px] leading-[1.85]">
        {block.text}
      </p>
    </div>
  );
}
