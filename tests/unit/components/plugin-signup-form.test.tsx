import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MuedsatSignupForm, MuedsatSignupFormFallback } from "@/components/features/muedsat-landing/muedsat-signup-form";
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

describe.each(["muedsat", "muedlim", "muedrive"] as const)("%s signup notice", (plugin) => {
  // kimny 2026-10-28 「B」: a news checkbox, default off; the POST says exactly what the box says.
  it.each([false, true])("the news checkbox starts unticked and the POST carries it (ticked: %s)", async (tick) => {
    render(<MuedsatSignupForm plugin={plugin} />);
    const namespace = PLUGIN_DIST[plugin].i18nNamespace;
    const box = screen.getByRole("checkbox", { name: `${namespace}.form.consent` });
    expect(box).not.toBeChecked();
    if (tick) fireEvent.click(box);
    expect(screen.getByText(`${namespace}.form.note`)).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: `${namespace}.form.emailLabel` }), {
      target: { value: "listener@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: `${namespace}.form.submit` }));
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body).marketingOptIn).toBe(tick);
    expect(screen.getByText(`${namespace}.form.note`)).toBeVisible();
    expect(endpoint).toBe(PLUGIN_DIST[plugin].subscribeEndpoint);
    expect(JSON.parse(options.body)).toEqual(expect.objectContaining({
      email: "listener@example.com", locale: "en",
    }));
  });
  it("keeps the notice visible alongside the red validation error", () => {
    render(<MuedsatSignupForm plugin={plugin} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("alert")).toHaveTextContent(`${plugin}.form.errorEmail`);
    expect(screen.getByText(`${plugin}.form.note`)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders the same notice in the Suspense fallback", () => {
    render(<MuedsatSignupFormFallback plugin={plugin} />);
    expect(screen.getByText(`${plugin}.form.note`)).toBeVisible();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
