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
  it("shows the notice without a checkbox and omits the legacy field from POST", async () => {
    render(<MuedsatSignupForm plugin={plugin} />);
    const namespace = PLUGIN_DIST[plugin].i18nNamespace;
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText(`${namespace}.form.note`)).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: `${namespace}.form.emailLabel` }), {
      target: { value: "listener@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: `${namespace}.form.submit` }));
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).not.toHaveProperty("marketingOptIn");
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
