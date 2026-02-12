import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { GAME_ORDER } from '@/lib/muedlobe/constants';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { LobeListContent } from './LobeListContent';

export default async function LobePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/lobe');

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
