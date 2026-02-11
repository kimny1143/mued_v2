import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import type { SignificantPattern, PromptParams } from '@/types/muedlobe';
import { ResultsContent } from './ResultsContent';

export default async function LobeResultsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [profile, measurements] = await Promise.all([
    cognitiveProfileRepository.findByUserId(userId),
    cognitiveProfileRepository.findMeasurementsByUserId(userId),
  ]);

  const scores = profile
    ? {
        wm: profile.wmScore ?? 0,
        ps: profile.psScore ?? 0,
        vc: profile.vcScore ?? 0,
        pr: profile.prScore ?? 0,
        att: profile.attScore ?? 0,
      }
    : null;

  const patterns = (profile?.significantPatterns as SignificantPattern[] | null) ?? [];
  const promptParams = profile?.promptParams as PromptParams | null;
  const measuredAt = profile?.measuredAt
    ? new Date(profile.measuredAt).toLocaleDateString()
    : null;

  const serializedMeasurements = measurements.map((m) => ({
    id: m.id,
    gameType: m.gameType,
    calculatedScore: m.calculatedScore as Record<string, number> | null,
    measuredAt: m.measuredAt ? m.measuredAt.toISOString() : null,
  }));

  return (
    <ResultsContent
      scores={scores}
      patterns={patterns}
      promptParams={promptParams}
      measurements={serializedMeasurements}
      measuredAt={measuredAt}
      hasProfile={!!profile}
    />
  );
}
