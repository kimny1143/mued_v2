"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";
import { previousVersionFor, type PreviousVersion } from "@/lib/plugins/previous-versions";

/** In-page anchor of the full "what changed" section (the portal row links here too). */
export const VERSION_NOTES_ID = "version-notes";

type Props = {
  plugin: PluginKey;
  /** Injectable for tests; defaults to the registry pairing. */
  previous?: PreviousVersion | null;
};

function usePairing({ plugin, previous }: Props) {
  const dist = PLUGIN_DIST[plugin];
  const prev = previous === undefined ? previousVersionFor(plugin, dist.version) : previous;
  return { dist, prev };
}

/**
 * The one-line "this version changes existing sessions" notice on a free plugin's product page, placed
 * BEFORE the download form (kimny 2026-10-09: 「既存セッションの値が変わることを…ダウンロードページで明記」).
 *
 * ★One line + a link (conductor 2026-10-09, option (b)): it sits above the page's one form, which every
 *   new visitor uses, so it names who it is for ("if you have {previous} sessions") and that a value
 *   changes, and sends them to the full section below. ★MUEDlim has no in-plugin update notice (dsp, from
 *   source, 2026-10-09) — people arrive from the announcement mail or on their own.
 * ★Never links a file: the previous installer is on the portal, one step from the full section.
 * ★Renders nothing for a plugin with no kept previous build (lib/plugins/previous-versions.ts).
 */
export function PluginVersionNotice(props: Props) {
  const { dist, prev } = usePairing(props);
  const t = useTranslations(`${dist.i18nNamespace}.versionNotice`);
  if (!prev) return null;
  const vars = { version: dist.version, previous: prev.version, since: prev.changedIn };
  return (
    <p
      data-testid="plugin-version-notice"
      className="mt-6 max-w-md border-l-2 border-[#f5a524]/60 pl-3 text-[13px] leading-relaxed text-white/70"
    >
      {t("line", vars)}{" "}
      <a href={`#${VERSION_NOTES_ID}`} className="whitespace-nowrap text-[#f5a524] underline underline-offset-2 hover:text-[#ffb838]">
        {t("detailsLink", vars)}
      </a>
    </p>
  );
}

/** Optional per plugin: what came with the version besides the change the lead names. */
const ADDED = ["added", "display"] as const;
/**
 * A screen of the new version shown under the first "added" paragraph (conductor 2026-10-09: MUEDlim's 1:1 on).
 * 1000×700 like the product faceplates. Its alt is `versionNotice.addedImageAlt` — the words on the screen, with the version.
 */
const ADDED_IMAGE: Partial<Record<PluginKey, string>> = {
  muedlim: "/muedlim/faceplate-1.0.1-unity.webp",
};
const POINTS = ["saved", "automation", "au", "revert"] as const;

/** The full section: what changed, what it does to existing sessions, and how to go back. */
export function PluginVersionDetails(props: Props) {
  const { dist, prev } = usePairing(props);
  const t = useTranslations(`${dist.i18nNamespace}.versionNotice`);
  if (!prev) return null;
  const vars = { version: dist.version, previous: prev.version, since: prev.changedIn };
  const image = ADDED_IMAGE[props.plugin];
  return (
    <section id={VERSION_NOTES_ID} data-testid="plugin-version-details" className="scroll-mt-20 border-t border-white/5 px-6 py-14">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">{t("detailsHeading", vars)}</h2>
        <p className="mt-5 text-[17px] leading-[1.8] text-white/75">{t("lead", vars)}</p>
        {ADDED.filter((key) => t.has(key)).map((key) => (
          <div key={key}>
            <p className="mt-4 text-[15px] leading-relaxed text-white/70">{t(key, vars)}</p>
            {key === "added" && image && t.has("addedImageAlt") ? (
              <Image
                src={image}
                alt={t("addedImageAlt", vars)}
                width={1000}
                height={700}
                sizes="(min-width: 768px) 480px, 88vw"
                className="mt-5 h-auto w-full max-w-[480px] rounded-lg"
                data-testid="plugin-version-added-image"
              />
            ) : null}
          </div>
        ))}
        <h3 className="mt-8 text-lg font-medium text-white/85">{t("sessionsHeading", vars)}</h3>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-[15px] leading-relaxed text-white/70">
          {POINTS.map((key) => (
            <li key={key}>{t(key, vars)}</li>
          ))}
        </ul>
        <p className="mt-5 text-[15px]">
          <Link href="/dashboard/plugins" className="text-[#f5a524] underline underline-offset-2 hover:text-[#ffb838]">
            {t("previousLink", vars)}
          </Link>
        </p>
      </div>
    </section>
  );
}
