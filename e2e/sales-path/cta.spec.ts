/**
 * G2 — the shape of the buttons that sell, pinned in a real browser at phone width (390×844).
 * kimny 2026-10-04:「無料の方はデカいオレンジのボタンをただ押すだけなら赤いメッセージ。どっちがわかりやすいか、押しやすいか明白だ。」
 *
 * ★The TEMPLATE is the free download button (MUEDsat). Every other main CTA must:
 *   1. not be disabled (a greyed-out button before typing is what lost the demo, #1220)
 *   2. have the template's computed style (fill colour, text colour, radius, padding, weight) — no outline variant.
 *      ★Except the paid BUY button: same shape, but its own brighter fill and a glow, so a purchase is told apart
 *      from the demo and the free downloads (kimny 2026-10-04「購入とデモ（および無料）とで区別したい」).
 *   3. be as wide as the template (full width on a phone)
 *   4. sit below its email field when it has one (not above it)
 *   5. be within the first two screens (top < 2 × 844 px) — "一番売りたいものを一番先に見えるように"
 * ★Positive control: the shape before #1220 (grey/disabled, outline, half width, above the field, demo at 2.05
 *   screens) fails 1–5. Analytics and FastSpring requests are aborted — nothing is sent to production services.
 */
import { test, expect, type Page, type Locator } from "@playwright/test";
import ja from "../../messages/ja.json";
import en from "../../messages/en.json";

const VIEW_HEIGHT = 844;
const LOCALES = { ja, en } as const;
type Locale = keyof typeof LOCALES;

type Shape = {
  disabled: boolean;
  top: number;
  bottom: number;
  width: number;
  backgroundColor: string;
  color: string;
  borderRadius: string;
  padding: string;
  fontWeight: string;
  fontSize: string;
  height: number;
  borderStyle: string;
  boxShadow: string;
};

async function shapeOf(button: Locator): Promise<Shape> {
  await button.scrollIntoViewIfNeeded();
  return button.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      disabled: (el as HTMLButtonElement).disabled === true || el.getAttribute("aria-disabled") === "true",
      top: r.top + window.scrollY,
      bottom: r.bottom + window.scrollY,
      width: Math.round(r.width),
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      borderRadius: cs.borderRadius,
      padding: cs.padding,
      fontWeight: cs.fontWeight,
      fontSize: cs.fontSize,
      height: Math.round(r.height),
      borderStyle: cs.borderStyle,
      boxShadow: cs.boxShadow,
    };
  });
}

async function open(page: Page, path: string) {
  await page.context().route(/google-analytics\.com|\/g\/collect|googletagmanager\.com|fastspring/, (r) => r.abort());
  await page.context().addCookies([{ name: "mued_cookie_consent", value: "essential", url: new URL(path, test.info().project.use.baseURL ?? "http://localhost").toString() }]);
  await page.goto(path, { waitUntil: "networkidle" });
}

/**
 * ★The template is ALSO pinned to absolute values (CCO #1222): comparing every CTA to MUEDsat alone would stay
 *   green if MUEDsat itself broke (all ten share the same part). Filled amber, black text, pressable, solid
 *   (no outline-only border), and at least 85 % of the 390 px phone width (the page gutter is 24 px a side → 342).
 */
const TEMPLATE_FILL = "rgb(245, 165, 36)";
const TEMPLATE_TEXT = "rgb(0, 0, 0)";
const MIN_WIDTH = Math.floor(390 * 0.85);
/** The paid buy button (components/features/muedsp-landing/buy-button-style.ts): #ffbe3d + glow 0 0 18px rgba(255,190,61,.55). */
const BUY_FILL = "rgb(255, 190, 61)";
const BUY_GLOW = "rgba(255, 190, 61, 0.55) 0px 0px 18px";

async function template(page: Page, locale: Locale): Promise<Shape> {
  await open(page, `/${locale}/muedsat`);
  const model = await shapeOf(page.getByRole("button", { name: LOCALES[locale].muedsat.form.submit, exact: true }));
  expect(model.disabled, "template: pressable").toBe(false);
  expect(model.backgroundColor, "template: filled amber").toBe(TEMPLATE_FILL);
  expect(model.color, "template: black text").toBe(TEMPLATE_TEXT);
  expect(model.width, `template: at least ${MIN_WIDTH}px wide`).toBeGreaterThanOrEqual(MIN_WIDTH);
  expect(model.boxShadow, "template: no glow (the glow is the buy button's alone)").toBe("none");
  return model;
}

/** `buy`: the paid buy button — the template's shape, but its own fill and a glow (checked separately). */
function expectSameShape(actual: Shape, model: Shape, { buy = false } = {}) {
  expect(actual.disabled, "the CTA must be pressable (no greyed-out button)").toBe(false);
  expect(
    { color: actual.color, borderRadius: actual.borderRadius, padding: actual.padding, fontWeight: actual.fontWeight, fontSize: actual.fontSize, borderStyle: actual.borderStyle },
    "the CTA must have the free download button's shape",
  ).toEqual({ color: model.color, borderRadius: model.borderRadius, padding: model.padding, fontWeight: model.fontWeight, fontSize: model.fontSize, borderStyle: model.borderStyle });
  if (buy) {
    expect(actual.backgroundColor, "buy: its own brighter fill").toBe(BUY_FILL);
    expect(actual.backgroundColor, "buy: told apart from the demo / free fill").not.toBe(model.backgroundColor);
    expect(actual.boxShadow, "buy: glows").toContain(BUY_GLOW);
  } else {
    expect(actual.backgroundColor, "the template's fill").toBe(model.backgroundColor);
    expect(actual.boxShadow, "no glow — only the buy button glows").toBe(model.boxShadow);
  }
  expect(Math.abs(actual.height - model.height), `height ${actual.height} vs template ${model.height}`).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.width - model.width), `width ${actual.width} vs template ${model.width}`).toBeLessThanOrEqual(1);
  expect(actual.top, `top ${Math.round(actual.top)} px must be within the first two screens (${2 * VIEW_HEIGHT})`).toBeLessThan(2 * VIEW_HEIGHT);
}

async function expectBelowEmail(page: Page, button: Shape, emailSelector: string) {
  const email = page.locator(emailSelector).first();
  const box = await email.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { bottom: r.bottom + window.scrollY };
  });
  expect(button.top, "the CTA must sit below its email field").toBeGreaterThanOrEqual(box.bottom - 1);
}

for (const locale of Object.keys(LOCALES) as Locale[]) {
  const m = LOCALES[locale];

  test.describe(`${locale}: free download buttons`, () => {
    for (const ns of ["muedsat", "muedlim", "muedrive"] as const) {
      test(`${ns}`, async ({ page }) => {
        const model = await template(page, locale);
        await open(page, `/${locale}/${ns}`);
        const shape = await shapeOf(page.getByRole("button", { name: m[ns].form.submit, exact: true }));
        expectSameShape(shape, model);
        await expectBelowEmail(page, shape, 'input[type="email"]');
      });
    }
  });

  test.describe(`${locale}: masterchain`, () => {
    test("buy", async ({ page }) => {
      const model = await template(page, locale);
      await open(page, `/${locale}/muedsp`);
      const shape = await shapeOf(page.getByRole("button", { name: m.muedsp.masterchain.buyLabelLive, exact: true }));
      expectSameShape(shape, model, { buy: true });
    });

    test("demo (try)", async ({ page }) => {
      const model = await template(page, locale);
      await open(page, `/${locale}/muedsp`);
      const button = page.getByRole("button", { name: m.muedsp.buyTry.try, exact: true });
      const shape = await shapeOf(button);
      expectSameShape(shape, model);
      await expectBelowEmail(page, shape, '#masterchain-demo-email');
      await expect(page.locator('#demo input[type="email"]')).toHaveCount(1);
      await expect(page.locator('#demo input[type="password"]')).toHaveCount(0);
      // ★One checkbox only: the news consent (kimny 2026-10-28 「B」), unticked, and the button does not wait for it
      //   (not disabled — checked by expectSameShape above). #1236 allowed no checkbox at all; this is the one exception.
      await expect(page.locator('#demo input[type="checkbox"]')).toHaveCount(1);
      const consent = page.locator("#demo").getByRole("checkbox", { name: m.muedsp.demo.consent, exact: true });
      await expect(consent).not.toBeChecked();
    });

    /**
     * The cart's product line on a phone (Chief 2026-10-04 (c), #1232): name → price → formats, the price UNDER the
     * name — a figure beside the name squeezed the name to 2 lines and the formats to 3 with a yen quote (¥12,404).
     * ★Positive control: the #1231 layout (price in a right-hand column) puts the price beside the name → red.
     * FastSpring is aborted here, so the line shows the "$69" fallback after the quote wait (QUOTE_WAIT_MS).
     */
    test("cart: product line order on a phone", async ({ page }) => {
      await open(page, `/${locale}/muedsp`);
      const buy = page.getByRole("button", { name: m.muedsp.masterchain.buyLabelLive, exact: true });
      await buy.scrollIntoViewIfNeeded();
      await buy.click();
      const cart = page.getByTestId("cart");
      await expect(cart).toBeVisible();
      const price = cart.getByTestId("cart-line-price");
      await expect(price).toHaveText(m.muedsp.buyTry.orderPrice, { timeout: 15_000 });
      const box = async (el: Locator) => {
        const b = await el.boundingBox();
        if (!b) throw new Error("not rendered");
        return b;
      };
      const name = await box(cart.getByTestId("cart-line-name"));
      const fig = await box(price);
      const formats = await box(cart.getByText(m.muedsp.buyTry.orderFormats, { exact: true }));
      expect(fig.y, "price under the name").toBeGreaterThanOrEqual(name.y + name.height - 1);
      expect(formats.y, "formats under the price").toBeGreaterThanOrEqual(fig.y + fig.height - 1);
      expect(fig.x, "price in the name's column, not beside it").toBeLessThan(name.x + name.width);
    });
  });
}
