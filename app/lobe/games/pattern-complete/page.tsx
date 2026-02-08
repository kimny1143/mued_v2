'use client';

import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';
import { PatternComplete } from '@/components/features/lobe/games/PatternComplete';

export default function PatternCompletePage() {
  return (
    <GamePageWrapper gameType="pattern-complete">
      {({ onComplete }) => <PatternComplete onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
