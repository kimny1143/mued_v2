'use client';

import dynamic from 'next/dynamic';
import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';

const ToneSequence = dynamic(
  () => import('@/components/features/lobe/games/ToneSequence').then(mod => mod.ToneSequence),
  { ssr: false }
);

export default function ToneSequencePage() {
  return (
    <GamePageWrapper gameType="tone-sequence" requiresLandscape>
      {({ onComplete }) => <ToneSequence onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
