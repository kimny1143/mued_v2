"use client";

import { useState } from "react";

export function LicenseKeyActions({ licenseKey, label, copyLabel, copiedLabel, failedLabel, downloadLabel }: {
  licenseKey: string;
  label: string;
  copyLabel: string;
  copiedLabel: string;
  failedLabel: string;
  downloadLabel: string;
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
  function download() {
    const url = URL.createObjectURL(new Blob([licenseKey], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "license.key";
    document.body.appendChild(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      // ★Revoke AFTER the click has been handled. Revoking synchronously can cancel the download in
      //   some browsers (Safari notably) — and the buyers are on macOS.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  return (
    <div className="mt-4 min-w-0">
      <p className="mb-2 text-sm text-white/65">{label}</p>
      <pre className="max-h-48 select-text overflow-y-auto whitespace-pre-wrap break-all rounded border border-[#f5a524]/25 bg-black/30 p-3 font-mono text-xs leading-relaxed text-white">{licenseKey}</pre>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="rounded border border-[#f5a524] px-4 py-2 text-sm text-[#f5a524] focus-visible:outline-2 focus-visible:outline-offset-2">
          {state === "copied" ? copiedLabel : copyLabel}
        </button>
        <button type="button" onClick={download} className="rounded border border-[#f5a524] px-4 py-2 text-sm text-[#f5a524] focus-visible:outline-2 focus-visible:outline-offset-2">
          {downloadLabel}
        </button>
      </div>
      <p role="status" className="mt-2 text-sm text-white/70">
        {state === "failed" ? failedLabel : state === "copied" ? copiedLabel : ""}
      </p>
    </div>
  );
}
