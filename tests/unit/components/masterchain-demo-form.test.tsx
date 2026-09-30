import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MasterchainDemoForm } from "@/components/features/muedsp-landing/masterchain-demo-form";

const m = vi.hoisted(() => ({ live: true, assign: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/masterchain/config", () => ({ get MASTERCHAIN_DEMO_LIVE() { return m.live; } }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("utm_source=news&utm_term=audio&utm_medium=email&utm_campaign=launch&utm_content=cta") }));
beforeEach(() => {
  m.live = true;
  vi.stubGlobal("fetch", m.fetch);
  // Keep the real DOM window intact; only replace its location descriptor for navigation assertions.
  vi.stubGlobal("location", { assign: m.assign });
  m.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, downloadUrl: "https://mued.jp/downloads/demo.pkg" }) });
});
afterEach(() => vi.unstubAllGlobals());
it("renders nothing when closed", () => {
  m.live = false;
  expect(render(<MasterchainDemoForm />).container).toBeEmptyDOMElement();
});
it.each([false, true])("consent defaults off and is posted explicitly (ticked: %s); download starts", async (tick) => {
  render(<MasterchainDemoForm />);
  const checkbox = screen.getByRole("checkbox");
  expect(checkbox).not.toBeChecked();
  if (tick) fireEvent.click(checkbox);
  fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "person@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "submit" }));
  await waitFor(() => expect(m.assign).toHaveBeenCalledWith("https://mued.jp/downloads/demo.pkg"));
  expect(m.fetch).toHaveBeenCalledTimes(1);
  expect(m.fetch.mock.calls[0][0]).toBe("/api/masterchain/demo");
  expect(JSON.parse(m.fetch.mock.calls[0][1].body)).toEqual({ email: "person@example.com", locale: "en", marketingOptIn: tick, website: "", utm_source: "news", utm_term: "audio", utm_medium: "email", utm_campaign: "launch", utm_content: "cta" });
  expect(screen.getByRole("status")).toHaveTextContent("success");
});
it.each(["invalid_email", "disposable_email", "rate_limited", "unexpected"])("maps API error %s", async (error) => {
  m.fetch.mockResolvedValue({ ok: false, json: async () => ({ error }) });
  render(<MasterchainDemoForm />);
  fireEvent.click(screen.getByRole("button", { name: "submit" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(`errors.${error === "unexpected" ? "generic" : error}`);
  expect(m.assign).not.toHaveBeenCalled();
});
