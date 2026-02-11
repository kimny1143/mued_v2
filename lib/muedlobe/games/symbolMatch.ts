/**
 * Symbol Match (PS-1) - Game Logic
 *
 * 視覚走査・弁別速度を測定。
 * ターゲット記号が比較群に含まれるかを判定する。
 */

import { SYMBOLS, SYMBOL_MATCH_CONFIG, SYMBOL_CONFUSABLES } from '../constants';
import type { SymbolMatchTrial, SymbolMatchResult } from '@/types/muedlobe';
import { gameLog } from './debug';

/** Pick n random unique items from array */
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** Generate a single trial with confusability injection */
export function generateTrial(): SymbolMatchTrial {
  const { targetCount, comparisonCount, targetPresenceRate } = SYMBOL_MATCH_CONFIG;
  const hasTarget = Math.random() < targetPresenceRate;
  const injectConfusable = Math.random() < 0.5;

  // Pick target symbols
  const targetSymbols = pickRandom(SYMBOLS, targetCount);

  // Build comparison group
  const remaining = SYMBOLS.filter(s => !targetSymbols.includes(s));
  let comparisonSymbols: string[];

  if (hasTarget) {
    // Include 1 target + fill rest from non-targets
    const includedTarget = pickRandom(targetSymbols, 1);
    const fillers = pickRandom(remaining, comparisonCount - 1);
    comparisonSymbols = [...includedTarget, ...fillers].sort(() => Math.random() - 0.5);
  } else {
    // No target present — optionally inject a confusable symbol to increase difficulty
    if (injectConfusable) {
      // Find a confusable for one of the targets that isn't a target itself
      const confusables = targetSymbols.flatMap(t =>
        (SYMBOL_CONFUSABLES[t] ?? []).filter(c => !targetSymbols.includes(c))
      );
      if (confusables.length > 0) {
        const confusable = confusables[Math.floor(Math.random() * confusables.length)];
        const nonConfusableRemaining = remaining.filter(s => s !== confusable);
        const fillers = pickRandom(nonConfusableRemaining, comparisonCount - 1);
        comparisonSymbols = [confusable, ...fillers].sort(() => Math.random() - 0.5);
      } else {
        comparisonSymbols = pickRandom(remaining, comparisonCount);
      }
    } else {
      comparisonSymbols = pickRandom(remaining, comparisonCount);
    }
  }

  return {
    targetSymbols,
    comparisonSymbols,
    hasTarget,
    userAnswer: null,
    correct: null,
    responseTime: null,
  };
}

/** Score the completed game */
export function scoreSymbolMatch(trials: SymbolMatchTrial[]): SymbolMatchResult {
  gameLog('SymbolMatch', 'scoreSymbolMatch:input', { trialCount: trials.length });
  const answered = trials.filter(t => t.userAnswer !== null);
  let correct = 0;
  let incorrect = 0;

  for (const trial of answered) {
    if (trial.userAnswer === trial.hasTarget) {
      correct++;
    } else {
      incorrect++;
    }
  }

  const result = {
    correct,
    incorrect,
    totalAttempted: answered.length,
    rawScore: correct - incorrect,
  };
  gameLog('SymbolMatch', 'scoreSymbolMatch:output', result);
  return result;
}
