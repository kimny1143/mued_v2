import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import QRCode from "qrcode";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "print", "advisory-hachioji-leaflet.html");
const OUTPUT = join(ROOT, "public", "advisory", "hachioji-leaflet-ja.pdf");
const TARGET_URL = "https://mued.jp/ja/advisory";
const FIXED_PDF_DATE = "D:20260921000000+00'00'";

const source = await readFile(SOURCE, "utf8");
const qrSvg = await QRCode.toString(TARGET_URL, {
  type: "svg",
  errorCorrectionLevel: "Q",
  margin: 0,
  width: 256,
  color: { dark: "#1d1b18", light: "#fffdf8" },
});
const html = source.replace("{{QR_CODE_SVG}}", qrSvg);

if (html === source) {
  throw new Error("QR placeholder was not found in the leaflet source");
}

await mkdir(dirname(OUTPUT), { recursive: true });

const browser = await puppeteer.launch({ headless: true });
let pdf;
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.emulateMediaType("print");
  pdf = Buffer.from(
    await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
  );
} finally {
  await browser.close();
}

// Chromium stamps the current time into otherwise stable output. Replacing same-length PDF date
// fields keeps xref offsets intact and makes repeated builds byte-for-byte reproducible.
const normalized = Buffer.from(
  pdf
    .toString("latin1")
    .replace(/D:\d{14}[+-]\d{2}'\d{2}'/g, FIXED_PDF_DATE)
    .replace(/D:\d{14}Z/g, "D:20260921000000Z"),
  "latin1",
);

await writeFile(OUTPUT, normalized);

const hash = createHash("sha256").update(normalized).digest("hex");
console.log(`${OUTPUT}\nsha256 ${hash}\n${normalized.length} bytes`);
