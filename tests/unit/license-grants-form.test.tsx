/**
 * The operator form at /dashboard/admin/license-grants (kimny only).
 * ★2026-10-15 (conductor, kimny's 「masterchainにもMUEDvoxと同じレビュワープログラムを入れたい」): a product picker —
 *   MUEDvox stays the default — and, after a key is issued, the line that the plug-in shows no expiry, so the date
 *   has to be told by mail (dsp 2026-10-15: masterchain says "LICENSED" only while the key lasts).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { LicenseGrantsForm } from "@/app/dashboard/admin/license-grants/license-grants-form";
import { GRANTABLE_PRODUCTS } from "@/lib/plugins/license-grants";

const PRODUCTS = [{ key: "muedvox", label: "MUEDvox" }, { key: "masterchain", label: "masterchain" }];

function fill() {
  fireEvent.change(screen.getByLabelText(/メールアドレス/), { target: { value: "tester@example.com" } });
  fireEvent.change(screen.getByLabelText(/理由/), { target: { value: "reviewer" } });
}

function mockFetch() {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      return new Response(JSON.stringify({ grant: { email: "tester@example.com", expiresAt: "2026-10-29T12:00:00Z" } }), { status: 201 });
    }
    return new Response(JSON.stringify({ grants: [] }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("★the product picker", () => {
  it("defaults to MUEDvox and sends what is picked", async () => {
    const fetchMock = mockFetch();
    render(<LicenseGrantsForm maxDays={90} products={PRODUCTS} />);
    const picker = screen.getByLabelText("製品") as HTMLSelectElement;
    expect(picker.value).toBe("muedvox");
    fill();
    fireEvent.change(picker, { target: { value: "masterchain" } });
    fireEvent.click(screen.getByRole("button", { name: "鍵を出す" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(post[1]!.body))).toMatchObject({ email: "tester@example.com", product: "masterchain", days: 14 });
  });

  it("the page hands the form exactly what the API accepts, in its order (the first is the default)", () => {
    const page = readFileSync("app/dashboard/admin/license-grants/page.tsx", "utf8");
    expect(page).toContain("GRANTABLE_PRODUCTS.map(");
    expect(GRANTABLE_PRODUCTS[0]).toBe("muedvox");
  });
});

describe("★the expiry is not on the plug-in's screen", () => {
  it("after issuing, the operator is told to send the date by mail", async () => {
    mockFetch();
    render(<LicenseGrantsForm maxDays={90} products={PRODUCTS} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "鍵を出す" }));
    const message = await screen.findByTestId("grant-message");
    expect(message.textContent).toContain("期限は画面に出ません。期限の日を本人にメールで伝えてください");
  });

  it("the standing note says the extension is pasted after the first key runs out", () => {
    render(<LicenseGrantsForm maxDays={90} products={PRODUCTS} />);
    const note = screen.getByTestId("grant-expiry-note").textContent ?? "";
    expect(note).toContain("LICENSED");
    expect(note).toContain("切れて DEMO に戻ってから");
  });
});
