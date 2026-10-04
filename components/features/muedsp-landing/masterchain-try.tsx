"use client";

import { useTranslations } from "next-intl";
import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_DOWNLOAD_URL, MASTERCHAIN_WINDOWS_LIVE, MASTERCHAIN_WINDOWS_URL, MASTERCHAIN_WINDOWS_VERSION } from "@/lib/masterchain/config";
import { masterchainWindowsBuild } from "@/lib/plugins/windows-beta";
import { trackCtaClick } from "@/lib/analytics/gtag";

/** Public installers: downloading the demo requires no form or API request. */
export function MasterchainTry() {
  const t = useTranslations("muedsp.buyTry");
  if (!MASTERCHAIN_DEMO_LIVE) return null;
  const windows = masterchainWindowsBuild(MASTERCHAIN_WINDOWS_LIVE, MASTERCHAIN_WINDOWS_URL, MASTERCHAIN_WINDOWS_VERSION);
  const downloads = [
    { os: "mac", url: MASTERCHAIN_DOWNLOAD_URL, label: t("downloadMac"), formats: "macOS · AU / VST3 / AAX" },
    ...(windows ? [{ os: "windows", url: windows.url, label: t("downloadWindows"), formats: "Windows · VST3" }] : []),
  ];
  return (
    <div id="demo" className="max-w-xl scroll-mt-20 space-y-4">
      <p className="text-sm text-white/65">{t("directDownloadNote")}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {downloads.map(({ os, url, label, formats }) => (
          <div key={os} className="flex-1 space-y-2">
            <a href={url} download aria-describedby="masterchain-demo-note"
              onClick={() => trackCtaClick("masterchain", `demo_direct_${os}`, "download_link")}
              className="block rounded-[var(--radius-lg)] bg-[#f5a524] px-6 py-3.5 text-center font-semibold text-black transition-colors hover:bg-[#ffb638] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5a524]">
              {label}
            </a>
            <p className="text-xs text-white/50">{formats}</p>
          </div>
        ))}
      </div>
      <p id="masterchain-demo-note" className="text-xs leading-relaxed text-white/50">{t("demoNote")}</p>
    </div>
  );
}
