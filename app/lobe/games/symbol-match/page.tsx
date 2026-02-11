'use client';

import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';
import { SymbolMatch } from '@/components/features/lobe/games/SymbolMatch';

export default function SymbolMatchPage() {
  return (
    <GamePageWrapper gameType="symbol-match">
      {({ onComplete }) => <SymbolMatch onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
