'use client';

import { type TakeStage, type TakeEntry } from '@/components/dial/unified-session-player';
import { formatTakeDuration } from '@/lib/dial/format-duration';
import { Micro } from './atoms';
import { IconSpinner, IconChevron } from './icons';

// ─── Derived types ────────────────────────────────────────────────────────────

export interface TakeSub {
  id: string;
  n: string;
  label: string;
  when: string;
  flag?: string;
  /** Persistent generation duration label (e.g. "1分49秒で完了"); null when unknown. */
  duration?: string | null;
}

export interface TakeGroup {
  key: TakeStage;
  label: string;
  count: number;
  processing: boolean;
  disabled: boolean;
  subs: TakeSub[];
}

/** Convert flat TakeEntry[] → grouped TakeGroup[] ordered RAW→MIXED→MASTERED */
export function groupTakeEntries(takes: TakeEntry[]): TakeGroup[] {
  const order: TakeStage[] = ['RAW', 'MIXED', 'MASTERED'];
  return order.map((stage) => {
    const entries = takes.filter((t) => t.label === stage);
    const enabled = entries.filter((t) => t.enabled);
    const hasProcessing = entries.some((t) => !t.enabled);
    return {
      key: stage,
      label: stage,
      count: enabled.length,
      processing: hasProcessing && enabled.length === 0,
      disabled: entries.length === 0,
      subs: enabled.map((t, i) => ({
        id: t.id,
        n: String(i + 1).padStart(2, '0'),
        label: t.sublabel ?? `${stage} ${i + 1}`,
        when: formatWhen(t.createdAt),
        flag: stage === 'RAW' && i === 0 ? 'SRC' : undefined,
        duration: formatTakeDuration(t.createdAt, t.completedAt),
      })),
    };
  });
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── TakePill ─────────────────────────────────────────────────────────────────

interface TakePillProps {
  take: TakeGroup;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  processing?: boolean;
}

export function TakePill({ take, active, onClick, disabled, processing }: TakePillProps) {
  const color = active ? 'var(--amber)' : 'var(--fg-1)';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        'group relative h-8 pl-3 pr-2 flex items-center gap-2 rounded-[3px] border transition-colors ' +
        (active
          ? 'bg-[#221809] border-[color:var(--amber-dim)] '
          : processing
            ? 'shimmer border-[color:var(--line)] '
            : 'bg-[#0f0f11] border-[color:var(--line)] hover:border-[#2f2f34] ')
      }
    >
      {/* Status lamp */}
      <span
        className="w-[5px] h-[5px] rounded-full"
        style={{
          background: processing ? '#7a7770' : active ? 'var(--amber)' : '#3a3a3e',
          boxShadow: active ? '0 0 4px var(--amber)' : 'none',
        }}
      />
      <span
        className="mono text-[11px] tracking-[0.14em] font-semibold uppercase"
        style={{ color }}
      >
        {take.label}
      </span>
      {/* Count badge */}
      {take.count > 0 && !processing && (
        <span
          className={
            'mono text-[9px] h-4 min-w-[16px] px-1 rounded-[2px] flex items-center justify-center border ' +
            (active
              ? 'bg-[#2e2209] border-[color:var(--amber-dim)] text-[color:var(--amber)]'
              : 'bg-[#17171a] border-[color:var(--line)] text-[color:var(--fg-1)]')
          }
        >
          {take.count}
        </span>
      )}
      {/* Processing indicator */}
      {processing && (
        <span className="flex items-center gap-1.5 text-[color:var(--fg-2)]">
          <IconSpinner size={11} />
          <span className="mono text-[9px] uppercase tracking-wider">processing</span>
        </span>
      )}
    </button>
  );
}

// ─── TakeHistory ──────────────────────────────────────────────────────────────

interface GainMatchProps {
  disabled: boolean;
  active: boolean;
  onMatch(): void;
  matchLabel: string;
  title?: string;
}

interface TakeHistoryProps {
  open: boolean;
  takes: TakeGroup[];
  activeTake: TakeStage;
  activeSub: TakeSub | null;
  onPick: (key: TakeStage, subId: string) => void;
  onToggle: () => void;
  /** Per-take decode status — shows spinner/dim while decoding, error state on failure */
  takeDecodeStatus?: Record<string, 'decoding' | 'ready' | 'error'>;
  /** Gain match button — shown in RAW column header when both RAW and MIXED takes exist */
  gainMatch?: GainMatchProps;
}

export function TakeHistory({ open, takes, activeTake, activeSub, onPick, onToggle, takeDecodeStatus, gainMatch }: TakeHistoryProps) {
  const activeTakeObj = takes.find((t) => t.key === activeTake);
  return (
    <div className="bg-[color:var(--ink-1)] border border-[color:var(--line)] rounded-[3px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full h-7 px-3 flex items-center justify-between border-b border-[color:var(--line-soft)] hover:bg-[#111114]"
      >
        <div className="flex items-center gap-2">
          <Micro>Take History</Micro>
          <span className="mono text-[10px] text-[color:var(--fg-1)]">
            / {activeTakeObj?.label} · {activeSub?.label ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[color:var(--fg-2)]">
          <Micro tone="var(--fg-3)">{open ? 'COLLAPSE' : 'EXPAND'}</Micro>
          <IconChevron dir={open ? 'up' : 'down'} size={10} />
        </div>
      </button>

      {open && (
        <div className="grid grid-cols-3 divide-x divide-[color:var(--line-soft)]">
          {takes.map((take) => (
            <div key={take.key} className="p-2">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <div className="flex items-center gap-1.5">
                  <Micro tone={take.key === activeTake ? 'var(--amber)' : 'var(--fg-2)'}>
                    {take.label}
                  </Micro>
                  {take.key === 'RAW' && gainMatch && (
                    <button
                      onClick={gainMatch.onMatch}
                      disabled={gainMatch.disabled}
                      title={gainMatch.title}
                      aria-pressed={gainMatch.active}
                      data-testid="dial-gain-match"
                      className="mono text-[9px] uppercase tracking-wider px-1.5 h-4 rounded-[2px] transition-colors disabled:opacity-30"
                      style={gainMatch.active
                        ? { color: 'var(--amber)', border: '1px solid var(--amber-dim)', background: '#221809' }
                        : { color: 'var(--fg-2)', border: '1px solid var(--line)' }
                      }
                    >
                      {gainMatch.matchLabel}
                    </button>
                  )}
                </div>
                <Micro tone="var(--fg-3)">
                  {take.subs.length} {take.subs.length === 1 ? 'ITEM' : 'ITEMS'}
                </Micro>
              </div>
              <div className="space-y-0.5">
                {take.subs.length === 0 ? (
                  <div className="text-[10px] mono text-[color:var(--fg-3)] px-1 py-2 italic">
                    no sub-takes yet
                  </div>
                ) : (
                  take.subs.map((sub) => {
                    const isActive = take.key === activeTake && sub.id === activeSub?.id;
                    const decodeStatus = takeDecodeStatus?.[sub.id];
                    const isDecoding = decodeStatus === 'decoding';
                    const isError = decodeStatus === 'error';
                    return (
                      <button
                        key={sub.id}
                        onClick={() => !isDecoding && onPick(take.key, sub.id)}
                        disabled={isDecoding}
                        title={isDecoding ? 'Decoding…' : isError ? 'クリックして再読み込み' : undefined}
                        className={
                          'w-full text-left px-2 py-1.5 rounded-[2px] flex items-center justify-between gap-2 transition-colors ' +
                          (isActive
                            ? 'bg-[#221809] text-[color:var(--amber)]'
                            : isDecoding
                              ? 'opacity-40 cursor-wait text-[color:var(--fg-2)]'
                              : isError
                                ? 'text-[color:var(--red)] hover:bg-[#15151a]'
                                : 'hover:bg-[#15151a] text-[color:var(--fg-1)]')
                        }
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="mono text-[9px] text-[color:var(--fg-3)] w-3">{sub.n}</span>
                          <span
                            className="text-[11px] truncate"
                            style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}
                          >
                            {sub.label}
                          </span>
                          {isDecoding && <IconSpinner size={9} />}
                          {!isDecoding && sub.flag && (
                            <span className="mono text-[8px] px-1 h-3.5 flex items-center rounded-[1.5px] bg-[#17171a] border border-[color:var(--line)] text-[color:var(--fg-2)] uppercase tracking-wider">
                              {sub.flag}
                            </span>
                          )}
                          {!isDecoding && sub.duration && (
                            <span className="mono text-[8px] text-[color:var(--fg-3)] whitespace-nowrap">
                              {sub.duration}
                            </span>
                          )}
                        </div>
                        {!isDecoding && (
                          <span className="mono text-[9px] text-[color:var(--fg-3)] whitespace-nowrap">
                            {sub.when}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
