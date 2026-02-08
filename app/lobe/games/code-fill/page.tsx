'use client';

import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';
import { CodeFill } from '@/components/features/lobe/games/CodeFill';

export default function CodeFillPage() {
  return (
    <GamePageWrapper gameType="code-fill">
      {({ onComplete }) => <CodeFill onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
