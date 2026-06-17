/**
 * Truthful synthetic tool_result content for replayed Hoo tool_use blocks (dialogue chat).
 *
 * Background — why this is not just `'ok'`:
 * The chat route (app/api/dial/chat/route.ts) replays a session's past assistant tool_use blocks
 * back into Hoo's context so it remembers prior actions. The Anthropic API requires every replayed
 * tool_use to be followed by a tool_result, so the route synthesises one. Previously that result was
 * a hardcoded `'ok'` for EVERY block — regardless of whether the action actually produced anything.
 *
 * That hardcoded `'ok'` caused a production dead-end (Yuu, session e3688b24, 2026-06-17): a past
 * `adjust_preview` whose preview generation had actually FAILED (no `dial_task` ever minted — the
 * RoEx-500 era) still replayed as `'ok'`. Hoo concluded a preview existed, replied
 * 「プレビューは既に作成済みだよ」 and stopped calling `adjust_preview`. With no completed preview the
 * server then (correctly) suppresses `request_final` → no Final-mix button renders → the user is
 * stuck: the preview never appears in the sidebar yet is treated as done, and no final can be made.
 *
 * Grounding the tool_result in the session's REAL task state lets Hoo reconcile its belief with
 * reality and retry the preview when the user asks. The happy path is unchanged: when a preview /
 * render genuinely exists, the result still says so.
 *
 * Pure + unit-testable; the route passes a small snapshot of the current task state.
 */

/** Snapshot of the session's current task reality, derived once from `dial_tasks`. */
export interface ChatTaskState {
  /** A `preview` task is completed → a usable preview exists in the sidebar. */
  hasCompletedPreview: boolean;
  /** A `mix_check` / `final_basic` / `final_advanced` task is completed → a mix render exists. */
  hasCompletedMixRender: boolean;
  /** A `mastering` task is completed → a mastered track exists. */
  hasCompletedMastering: boolean;
}

/** Minimal shape of a persisted tool_use block (dial_messages.tool_use_blocks entries). */
export interface PersistedToolUseBlock {
  id: string;
  name: string;
  input: unknown;
}

const PREVIEW_NOT_READY =
  'note: parameters were saved, but NO preview has been generated for this session yet — the ' +
  'preview did not complete and a preview does NOT currently exist. If the user wants to hear the ' +
  'mix, call propose_mix_action with action "adjust_preview" again to generate one. Do NOT tell the ' +
  'user a preview already exists.';

const PREVIEW_READY =
  'ok: parameters applied and a preview has been generated (available in the sidebar).';

const RENDER_NOT_READY =
  'note: no completed mix render exists yet for this session — the render has not been produced.';

const RENDER_READY = 'ok: the requested mix render completed (available in the sidebar).';

const MASTERING_NOT_READY = 'note: no mastered track has been generated for this session yet.';

const MASTERING_READY = 'ok: the mastered track has been generated.';

/**
 * Reality-grounded tool_result content for one replayed tool_use block.
 *
 * Falls back to `'ok'` for blocks we don't need to reconcile (style set, mastering param set, or any
 * unrecognised shape) so the change is strictly additive over the prior behaviour.
 */
export function syntheticToolResultContent(
  block: PersistedToolUseBlock | null | undefined,
  state: ChatTaskState,
): string {
  const action = (block?.input as { action?: unknown } | null | undefined)?.action;

  if (block?.name === 'propose_mix_action') {
    if (action === 'adjust_preview') {
      return state.hasCompletedPreview ? PREVIEW_READY : PREVIEW_NOT_READY;
    }
    if (action === 'request_mix_check' || action === 'request_final') {
      return state.hasCompletedMixRender ? RENDER_READY : RENDER_NOT_READY;
    }
  }

  if (block?.name === 'propose_mastering_action' && action === 'request_mastering_final') {
    return state.hasCompletedMastering ? MASTERING_READY : MASTERING_NOT_READY;
  }

  return 'ok';
}

/**
 * True when Hoo's text describes making/generating a preview. Used by the chat route to auto-inject
 * an `adjust_preview` action when Haiku narrates a preview ("プレビューを作るね") but forgets to call
 * the tool (~15% of runs) — without which the first preview never mints and the user waits forever.
 * Deliberately also matches the "プレビューは既に作成済み" hallucination so a stuck session self-heals.
 */
export function textProposesPreview(text: string | null | undefined): boolean {
  if (!text) return false;
  return /プレビュー[^。]{0,12}(作|生成|用意|出|つく)|(作成|生成|用意)[^。]{0,12}プレビュー|\bpreview\b/i.test(
    text,
  );
}

/** Derive the {@link ChatTaskState} snapshot from a session's tasks. */
export function deriveChatTaskState(
  tasks: Array<{ taskType: string; status: string }>,
): ChatTaskState {
  return {
    hasCompletedPreview: tasks.some(
      (t) => t.taskType === 'preview' && t.status === 'completed',
    ),
    hasCompletedMixRender: tasks.some(
      (t) =>
        (t.taskType === 'mix_check' ||
          t.taskType === 'final_basic' ||
          t.taskType === 'final_advanced') &&
        t.status === 'completed',
    ),
    hasCompletedMastering: tasks.some(
      (t) => t.taskType === 'mastering' && t.status === 'completed',
    ),
  };
}
