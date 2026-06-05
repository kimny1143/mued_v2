/**
 * ChatPanelV2 — generate-trigger behavior guard.
 *
 * Regression guard for PR #420: the v2 chat cutover initially shipped ChatPanelV2
 * without wiring the Final / Mix Check / Mastering Final generate buttons, so those
 * callbacks never fired (paid sessions couldn't complete). Type parity passed but
 * behavior parity did not — typecheck/build are green even when a passed-but-never-
 * invoked optional callback is dead. These tests assert the callbacks actually fire.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanelV2 } from '@/components/dial/v2/chat';

type Msg = { id: string; role: 'user' | 'assistant'; content: string; action?: string; parameterChanges?: unknown[]; createdAt: string };

function mockChatHistory(messages: Msg[]) {
  global.fetch = vi.fn((url: unknown, opts?: { method?: string }) => {
    const u = typeof url === 'string' ? url : '';
    if (u.includes('/api/dial/chat') && opts?.method !== 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: { messages } }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: {} }) });
  }) as unknown as typeof fetch;
}

const baseProps = {
  sessionId: 'sess-1',
  tracks: [{ id: 't1', originalFilename: 'vox.wav', instrumentGroup: 'VOCALS', presenceSetting: 'NORMAL' }],
  headers: {} as Record<string, string>,
  onParametersApplied: vi.fn(),
};

function trailingAction(action: string): Msg[] {
  return [{ id: 'a1', role: 'assistant', content: 'Ready.', action, parameterChanges: [], createdAt: '2026-06-05T00:00:00Z' }];
}

describe('ChatPanelV2 — generate triggers (behavior-parity regression guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom does not implement scrollIntoView (called in a post-render effect)
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('fires onFinalRequested when the Final Mix button is clicked', async () => {
    mockChatHistory(trailingAction('request_final'));
    const onFinalRequested = vi.fn();
    render(<ChatPanelV2 {...baseProps} onFinalRequested={onFinalRequested} />);

    const user = userEvent.setup();
    await user.click(await screen.findByTestId('dial-chat-generate-final'));
    expect(onFinalRequested).toHaveBeenCalledTimes(1);
  });

  it('fires onMixCheckRequested when the Mix Check button is clicked', async () => {
    mockChatHistory(trailingAction('request_mix_check'));
    const onMixCheckRequested = vi.fn();
    render(<ChatPanelV2 {...baseProps} mode="dialogue" onMixCheckRequested={onMixCheckRequested} />);

    const user = userEvent.setup();
    await user.click(await screen.findByTestId('dial-chat-generate-mix-check'));
    expect(onMixCheckRequested).toHaveBeenCalledTimes(1);
  });

  it('fires onMasteringFinalRequested when the Mastering Final button is clicked', async () => {
    mockChatHistory(trailingAction('request_mastering_final'));
    const onMasteringFinalRequested = vi.fn();
    render(<ChatPanelV2 {...baseProps} isMasteringPhase onMasteringFinalRequested={onMasteringFinalRequested} />);

    const user = userEvent.setup();
    await user.click(await screen.findByTestId('dial-chat-generate-mastering-final'));
    expect(onMasteringFinalRequested).toHaveBeenCalledTimes(1);
  });

  it('does not render a generate button once the action was already followed by a user reply (applied)', async () => {
    mockChatHistory([
      { id: 'a1', role: 'assistant', content: 'Ready.', action: 'request_final', parameterChanges: [], createdAt: '2026-06-05T00:00:00Z' },
      { id: 'u2', role: 'user', content: 'go', createdAt: '2026-06-05T00:00:02Z' },
    ]);
    render(<ChatPanelV2 {...baseProps} onFinalRequested={vi.fn()} />);

    await screen.findByText('Ready.'); // history loaded
    expect(screen.queryByTestId('dial-chat-generate-final')).toBeNull();
  });
});
