'use client';

import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';
import { WordBridge } from '@/components/features/lobe/games/WordBridge';

export default function WordBridgePage() {
  return (
    <GamePageWrapper gameType="word-bridge">
      {({ onComplete }) => <WordBridge onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
