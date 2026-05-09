export interface ReadinessInput {
  launches_within_30d?: boolean;
  has_stems?: boolean;
  vocal_ready?: boolean;
  product_intent?: string | null;
}

export interface ReadinessResult {
  score: number;
  qualified: boolean;
  launch_ready_recent: boolean;
}

export function calcReadinessScore(input: ReadinessInput): ReadinessResult {
  let score = 0;
  if (input.launches_within_30d === true) score++;
  if (input.has_stems === true) score++;
  if (input.vocal_ready === true) score++;
  if (input.product_intent && input.product_intent !== 'unknown') score++;
  return {
    score,
    qualified: score >= 3,
    launch_ready_recent: input.launches_within_30d === true,
  };
}
