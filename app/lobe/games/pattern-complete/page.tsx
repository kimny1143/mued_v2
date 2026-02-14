'use client';

import dynamic from 'next/dynamic';
import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';

const PatternComplete = dynamic(
  () => import('@/components/features/lobe/games/PatternComplete').then(mod => mod.PatternComplete),
  { ssr: false }
);

export default function PatternCompletePage() {
  return (
    <GamePageWrapper gameType="pattern-complete">
      {({ onComplete }) => <PatternComplete onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
