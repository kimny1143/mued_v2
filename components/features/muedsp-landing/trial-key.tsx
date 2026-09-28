"use client";

import { useState } from "react";

export function TrialKey({ licenseKey, label, copyLabel, copiedLabel, failedLabel }: {
  licenseKey: string;
  label: string;
  copyLabel: string;
  copiedLabel: string;
  failedLabel: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setState("copied");
    } catch {
      setState("failed");
    }
  }
  return (
    <div className="mt-4 min-w-0">
      <p className="mb-2 text-sm text-white/65">{label}</p>
      <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded border border-[#f5a524]/25 bg-black/30 p-3 font-mono text-xs leading-relaxed text-white">{licenseKey}</pre>
      <button type="button" onClick={copy} className="mt-2 rounded border border-[#f5a524] px-4 py-2 text-sm text-[#f5a524] focus-visible:outline-2 focus-visible:outline-offset-2">
        {state === "copied" ? copiedLabel : copyLabel}
      </button>
      <p role="status" className="mt-2 text-sm text-white/70">
        {state === "failed" ? failedLabel : state === "copied" ? copiedLabel : ""}
      </p>
    </div>
  );
}
