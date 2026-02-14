'use client';

import dynamic from 'next/dynamic';
import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';

const MentalMath = dynamic(
  () => import('@/components/features/lobe/games/MentalMath').then(mod => mod.MentalMath),
  { ssr: false }
);

export default function MentalMathPage() {
  return (
    <GamePageWrapper gameType="mental-math">
      {({ onComplete }) => <MentalMath onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
