import { auth } from '@clerk/nextjs/server';
import { GAME_ORDER } from '@/lib/muedlobe/constants';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { LobeListContent } from './LobeListContent';

export default async function LobePage() {
  // Auth is handled in layout.tsx — sign-in only, no paid tier. MUEDlobe was gated behind a
  // Premium subscription in d20704e6 and un-gated in d65d17ad (free-ify MUEDnote); this comment
  // kept claiming the paid gate for the ~4 months after it was removed. Nothing on screen shows
  // it, so only the comment was wrong — and it read as "members-only" to anyone opening the file.
  const { userId } = await auth();
  if (!userId) return null; // guarded by layout, satisfies TS

  const [measurements, profile] = await Promise.all([
    cognitiveProfileRepository.findMeasurementsByUserId(userId),
    cognitiveProfileRepository.findByUserId(userId),
  ]);

  const completedGames = measurements.map((m) => m.gameType);
  const allComplete = GAME_ORDER.every((g) => completedGames.includes(g));

  return (
    <LobeListContent
      completedGames={completedGames}
      hasProfile={!!profile}
      allComplete={allComplete}
    />
  );
}
