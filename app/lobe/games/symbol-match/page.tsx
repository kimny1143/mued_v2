'use client';

import dynamic from 'next/dynamic';
import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';

const SymbolMatch = dynamic(
  () => import('@/components/features/lobe/games/SymbolMatch').then(mod => mod.SymbolMatch),
  { ssr: false }
);

export default function SymbolMatchPage() {
  return (
    <GamePageWrapper gameType="symbol-match">
      {({ onComplete }) => <SymbolMatch onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
