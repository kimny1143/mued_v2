"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "./brand-mark";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  SessionLedger,
  type UnifiedSession,
} from "@/components/dashboard/session-ledger";
import { Panel, Readout, ToggleSquare } from "@/components/dial/v2/atoms";
import { Button } from "@/components/ui/button";

/** Review the real ledger and console primitives without exposing an account or invoking APIs. */
export function WorkspacePreview() {
  const { locale, t } = useLocale();
  const copy = t.studioShowroom.workspace;
  const [view, setView] = useState<"dashboard" | "console">("dashboard");
  const [mute, setMute] = useState(false);
  const [gain, setGain] = useState(-3);
  const sessions: UnifiedSession[] = [
    {
      id: "sample-mix",
      product: "dial",
      status: "completed",
      displayName: "Late night session",
      createdAt: new Date("2026-09-12T10:00:00Z"),
      href: "#sample-session",
    },
    {
      id: "sample-note",
      product: "muednote",
      status: "note",
      displayName: copy.note,
      createdAt: new Date("2026-09-11T10:00:00Z"),
      href: "#sample-session",
      durationSec: 1500,
    },
  ];
  return (
    <div className="brand-workspace min-h-screen">
      <header className="brand-workspace-header">
        <div className="brand-workspace-main flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8">
          <Link href={`/${locale}/redesign/studio`} aria-label="MUED">
            <BrandMark compact />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="brand-workspace-main px-5 py-8 sm:px-8">
        <p className="mb-6 border-l-2 border-accent pl-4 text-sm leading-relaxed text-fg-secondary">
          {copy.notice}
        </p>
        <h1 className="text-3xl font-medium tracking-tight text-fg-primary">
          {copy.title}
        </h1>
        <div
          className="my-8 flex flex-wrap gap-3"
          role="group"
          aria-label={copy.views}
        >
          <Button
            variant={view === "dashboard" ? "primary" : "outline"}
            aria-pressed={view === "dashboard"}
            onClick={() => setView("dashboard")}
          >
            {copy.dashboard}
          </Button>
          <Button
            variant={view === "console" ? "primary" : "outline"}
            aria-pressed={view === "console"}
            onClick={() => setView("console")}
          >
            {copy.console}
          </Button>
        </div>
        {view === "dashboard" ? (
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <SessionLedger sessions={sessions} />
              <p id="sample-session" className="text-sm text-fg-secondary">
                {copy.sessionNote}
              </p>
            </div>
            <aside className="border-t border-border-default pt-5">
              <h2 className="mb-5 font-mono text-xs uppercase tracking-widest text-accent">
                {copy.tools}
              </h2>
              {(
                [
                  ["MUEDsp", `/${locale}/muedsp`],
                  ["MUEDial", `/${locale}/muedial`],
                  [copy.settings, "/dashboard/settings"],
                ] as const
              ).map(([label, href]) => (
                <Link
                  className="flex min-h-12 items-center justify-between border-b border-border-default text-sm text-fg-primary hover:text-accent"
                  href={href}
                  key={href}
                >
                  {label}
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </aside>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel title={copy.channel}>
              <div className="flex items-center justify-between gap-4 py-6">
                <BrandMark product="MUEDial" compact />
                <Readout
                  value={mute ? "−∞" : gain.toFixed(1)}
                  unit="dB"
                  size="xl"
                  tone="var(--amber)"
                />
              </div>
              <div className="my-6 flex items-center gap-5">
                <ToggleSquare
                  label="M"
                  title={copy.mute}
                  on={mute}
                  onClick={() => setMute(!mute)}
                  tone="red"
                />
                <label
                  htmlFor="sample-gain"
                  className="text-sm text-fg-secondary"
                >
                  {copy.gain}
                </label>
                <input
                  id="sample-gain"
                  type="range"
                  min={-24}
                  max={6}
                  step={0.5}
                  value={gain}
                  onChange={(event) => setGain(Number(event.target.value))}
                  className="min-w-0 flex-1 accent-[var(--amber)]"
                />
              </div>
              <p className="border-t border-border-default pt-4 text-xs leading-relaxed text-fg-secondary">
                {copy.consoleNote}
              </p>
            </Panel>
            <Panel title="Hoo">
              <p className="py-5 text-sm leading-loose text-fg-primary">
                {copy.hoo}
              </p>
              <Button disabled>{copy.sendDisabled}</Button>
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
}
