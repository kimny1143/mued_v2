'use client';

import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';
import { MentalMath } from '@/components/features/lobe/games/MentalMath';

export default function MentalMathPage() {
  return (
    <GamePageWrapper gameType="mental-math">
      {({ onComplete }) => <MentalMath onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
