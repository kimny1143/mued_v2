'use client';

import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';
import { FocusFlow } from '@/components/features/lobe/games/FocusFlow';

export default function FocusFlowPage() {
  return (
    <GamePageWrapper gameType="focus-flow">
      {({ onComplete }) => <FocusFlow onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
