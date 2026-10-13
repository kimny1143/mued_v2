import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DOWNLOAD_REDIRECTS = [
  {
    source: "/downloads/MUEDlim-0.1.0-alpha-installer.pkg",
    destination: "/downloads/MUEDlim-0.1.2-installer.pkg",
  },
  {
    source: "/downloads/MUEDlim-0.1.1-alpha-installer.pkg",
    destination: "/downloads/MUEDlim-0.1.2-installer.pkg",
  },
  {
    source: "/downloads/MUEDrive-0.1.0-alpha-installer.pkg",
    destination: "/downloads/MUEDrive-0.1.2-installer.pkg",
  },
  {
    source: "/downloads/MUEDsat-0.1.0-alpha-installer.pkg",
    destination: "/downloads/MUEDsat-0.1.2-installer.pkg",
  },
  {
    source: "/downloads/MUEDsat-0.1.1-alpha-installer.pkg",
    destination: "/downloads/MUEDsat-0.1.2-installer.pkg",
  },
] as const;

async function configuredRedirects() {
  const { default: config } = await import("@/next.config");
  return config.redirects!();
}

describe("next.config — download aliases", () => {
  it.each(DOWNLOAD_REDIRECTS)(
    "redirects $source to its canonical 0.1.2 artifact temporarily",
    async ({ source, destination }) => {
      const redirects = await configuredRedirects();
      const redirect = redirects.find((entry) => entry.source === source);

      expect(redirect).toBeDefined();
      expect(redirect!.destination).toBe(destination);
      expect(redirect!.permanent).toBe(false);
      expect(existsSync(join(process.cwd(), "public", destination))).toBe(true);
    },
  );

  it("does not redirect canonical download paths", async () => {
    const redirectSources = new Set((await configuredRedirects()).map((entry) => entry.source));

    for (const { destination } of DOWNLOAD_REDIRECTS) {
      expect(redirectSources.has(destination)).toBe(false);
    }
  });
});
