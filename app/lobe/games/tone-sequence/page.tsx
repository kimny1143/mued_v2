'use client';

import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';
import { ToneSequence } from '@/components/features/lobe/games/ToneSequence';

export default function ToneSequencePage() {
  return (
    <GamePageWrapper gameType="tone-sequence" requiresLandscape>
      {({ onComplete }) => <ToneSequence onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
