/**
 * MUEDial player take types — shared by the v2 player, the take builder (lib/dial/session-takes),
 * and the legacy player component.
 *
 * Lives in lib/ so lib code (session-takes) no longer has to import types from a component
 * (the lib→component reverse-import nit from PR #452). The legacy player component re-exports
 * these for backward compatibility with existing component-side imports.
 */

export type TakeStage = 'RAW' | 'MIXED' | 'MASTERED';

export interface TakeEntry {
  id: string;
  label: TakeStage;
  /** Display name shown in TAKE History drawer (e.g. "Preview 2", "Mix Check 1", "Final Mix") */
  sublabel?: string;
  url: string;
  stemsUrls?: Record<string, string> | null;
  createdAt: string;
  /** false = task still processing; pill shown disabled with spinner, take not loaded */
  enabled: boolean;
}

export interface StemParamChange {
  track: string;
  changes: { gainDb?: number; panAngleDegrees?: number; reverbSend?: number };
  reason?: string;
}
