import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MuedsatSignupForm } from "@/components/features/muedsat-landing/muedsat-signup-form";
import { PLUGIN_DIST } from "@/lib/plugins/registry";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => "en",
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/analytics/gtag", () => ({ trackCtaClick: vi.fn() }));

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each(["muedsat", "muedlim", "muedrive"] as const)("%s signup consent", (plugin) => {
  it.each(["untouched", "checked", "unchecked again"])("sends explicit boolean consent when %s", async (action) => {
    render(<MuedsatSignupForm plugin={plugin} />);
    const namespace = PLUGIN_DIST[plugin].i18nNamespace;
    const checkbox = screen.getByRole("checkbox", { name: `${namespace}.form.consent` });
    expect(checkbox).not.toBeChecked();
    if (action !== "untouched") fireEvent.click(checkbox);
    if (action === "unchecked again") fireEvent.click(checkbox);
    fireEvent.change(screen.getByRole("textbox", { name: `${namespace}.form.emailLabel` }), {
      target: { value: "listener@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: `${namespace}.form.submit` }));
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetchMock.mock.calls[0];
    expect(endpoint).toBe(PLUGIN_DIST[plugin].subscribeEndpoint);
    expect(JSON.parse(options.body)).toEqual(expect.objectContaining({
      email: "listener@example.com", locale: "en", marketingOptIn: action === "checked",
    }));
  });
});
