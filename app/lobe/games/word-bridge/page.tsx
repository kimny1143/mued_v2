'use client';

import dynamic from 'next/dynamic';
import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';

const WordBridge = dynamic(
  () => import('@/components/features/lobe/games/WordBridge').then(mod => mod.WordBridge),
  { ssr: false }
);

export default function WordBridgePage() {
  return (
    <GamePageWrapper gameType="word-bridge">
      {({ onComplete }) => <WordBridge onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
