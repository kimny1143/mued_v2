'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';

// ─── Btn ─────────────────────────────────────────────────────────────────────

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function Btn({ active, className = '', children, ...rest }: BtnProps) {
  return (
    <button
      className={
        'h-7 px-2.5 rounded-[3px] border text-[11px] tracking-wide font-medium flex items-center gap-1.5 transition-colors ' +
        (active
          ? 'bg-[#2a1f0a] border-[color:var(--amber-dim)] text-[color:var(--amber)] '
          : 'bg-[#141417] border-[color:var(--line)] text-[color:var(--fg-1)] hover:text-[color:var(--fg-0)] hover:border-[#2f2f34] ') +
        className
      }
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── ToggleSquare ─────────────────────────────────────────────────────────────

type ToggleTone = 'amber' | 'red' | 'emerald';

const toneMap: Record<ToggleTone, { bg: string; text: string; dim: string }> = {
  amber:   { bg: 'bg-[color:var(--amber)]',   text: 'text-[#1a1200]', dim: 'text-[color:var(--fg-2)]' },
  red:     { bg: 'bg-[#c44a3c]',              text: 'text-[#140502]', dim: 'text-[color:var(--fg-2)]' },
  emerald: { bg: 'bg-[color:var(--emerald)]', text: 'text-[#081a0f]', dim: 'text-[color:var(--fg-2)]' },
};

interface ToggleSquareProps {
  on: boolean;
  onClick: () => void;
  label: string;
  tone?: ToggleTone;
  title?: string;
}

export function ToggleSquare({ on, onClick, label, tone = 'amber', title }: ToggleSquareProps) {
  const t = toneMap[tone];
  return (
    <button
      title={title}
      onClick={onClick}
      className={
        'w-6 h-6 rounded-[2px] mono text-[10px] font-bold leading-none flex items-center justify-center bevel-out ' +
        (on
          ? `${t.bg} ${t.text}`
          : `bg-[#17171a] border border-[color:var(--line)] ${t.dim} hover:text-[color:var(--fg-0)]`)
      }
    >
      {label}
    </button>
  );
}

// ─── Readout ──────────────────────────────────────────────────────────────────

type ReadoutSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const readoutSizes: Record<ReadoutSize, string> = {
  xs: 'text-[10px]',
  sm: 'text-[11px]',
  md: 'text-[13px]',
  lg: 'text-[22px]',
  xl: 'text-[34px]',
};

const unitSizes: Record<ReadoutSize, string> = {
  xs: 'text-[8px]',
  sm: 'text-[9px]',
  md: 'text-[10px]',
  lg: 'text-[11px]',
  xl: 'text-[13px]',
};

interface ReadoutProps {
  value: string | number;
  unit?: string;
  align?: 'left' | 'right';
  size?: ReadoutSize;
  tone?: string;
  className?: string;
}

export function Readout({ value, unit, align = 'right', size = 'sm', tone, className = '' }: ReadoutProps) {
  return (
    <span
      className={`mono ${readoutSizes[size]} tracking-tight inline-flex items-baseline gap-[3px] ${align === 'right' ? 'justify-end' : ''} ${className}`}
      style={tone ? { color: tone } : undefined}
    >
      <span>{value}</span>
      {unit && (
        <span className={`${unitSizes[size]} text-[color:var(--fg-2)] font-normal`}>{unit}</span>
      )}
    </span>
  );
}

// ─── Micro ────────────────────────────────────────────────────────────────────

interface MicroProps {
  children: ReactNode;
  className?: string;
  tone?: string;
}

export function Micro({ children, className = '', tone = 'var(--fg-2)' }: MicroProps) {
  return (
    <span
      className={`mono text-[9px] tracking-[0.14em] uppercase ${className}`}
      style={{ color: tone }}
    >
      {children}
    </span>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface PanelProps {
  children: ReactNode;
  className?: string;
  flush?: boolean;
  title?: string;
  right?: ReactNode;
}

export function Panel({ children, className = '', flush = false, title, right }: PanelProps) {
  return (
    <section className={`bg-[color:var(--ink-1)] border border-[color:var(--line)] rounded-[3px] ${className}`}>
      {title && (
        <header className="h-8 px-3 border-b border-[color:var(--line-soft)] flex items-center justify-between">
          <Micro>{title}</Micro>
          {right}
        </header>
      )}
      <div className={flush ? '' : 'p-3'}>{children}</div>
    </section>
  );
}
