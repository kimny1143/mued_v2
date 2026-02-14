'use client';

import dynamic from 'next/dynamic';
import { GamePageWrapper } from '@/components/features/lobe/games/GamePageWrapper';

const CodeFill = dynamic(
  () => import('@/components/features/lobe/games/CodeFill').then(mod => mod.CodeFill),
  { ssr: false }
);

export default function CodeFillPage() {
  return (
    <GamePageWrapper gameType="code-fill">
      {({ onComplete }) => <CodeFill onComplete={onComplete} />}
    </GamePageWrapper>
  );
}
