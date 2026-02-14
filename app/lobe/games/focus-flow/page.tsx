'use client';

import dynamic from 'next/dynamic';
import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';

const FocusFlow = dynamic(
  () => import('@/components/features/lobe/games/FocusFlow').then(mod => mod.FocusFlow),
  { ssr: false }
);

export default function FocusFlowPage() {
  return (
    <GamePageWrapper gameType="focus-flow">
      {({ onComplete }) => <FocusFlow onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
