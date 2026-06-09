/**
 * Track-editing lock for MUEDial sessions.
 *
 * The track set (add / replace / delete / parameter edit / fresh re-analyze) may only be changed
 * while a session is still in an early, pre-final state. Once a paid final mix / mastering has
 * started or completed, the track set is FROZEN — mutating it would invalidate the deliverable the
 * user paid for. Redo-after-final is handled by the comp flow (admin grant), not by silently
 * mutating a finished session.
 *
 * This is enforced SERVER-SIDE in every mutating track endpoint — upload/presign + upload/confirm
 * (add & in-place replace), tracks PATCH·DELETE, and a fresh analyze — not just hidden in the UI;
 * a direct API call must not be able to alter a paid deliverable. The UI uses the same predicate
 * to disable affordances.
 *
 * Status line (conductor-approved, 2026-06-09): editable through `previewing`; locked from the
 * first paid final onward (`mixing` is set once a mix_check/final cycle begins).
 */

/** Session statuses in which the track set is still editable. */
export const DIAL_TRACK_EDITABLE_STATUSES = ['uploading', 'previewing'] as const;

/** True while tracks may still be added / replaced / deleted / edited for this session status. */
export function isDialSessionTrackEditable(status: string | null | undefined): boolean {
  return status === 'uploading' || status === 'previewing';
}

/**
 * Machine-readable lock code + human message for a locked session, or null when editable.
 * Used by the API guards (409) and surfaced to the UI.
 */
export function dialTrackLockReason(
  status: string | null | undefined,
): { code: 'SESSION_LOCKED'; message: string } | null {
  if (isDialSessionTrackEditable(status)) return null;
  return {
    code: 'SESSION_LOCKED',
    message:
      'Tracks are locked once a final mix or mastering has started. To change tracks, start a redo.',
  };
}
