import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadCheckoutScript, openCheckout } = vi.hoisted(() => ({
  loadCheckoutScript: vi.fn(() => Promise.resolve(true)),
  openCheckout: vi.fn(() => true),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/masterchain/fastspring-checkout", () => ({
  MASTERCHAIN_CHECKOUT_ENABLED: true,
  loadCheckoutScript,
  openCheckout,
}));

const props = {
  locale: "en",
  buyLabel: "Buy",
  consentPrefix: "I have read and agree to the",
  eulaLabel: "EULA",
};

describe("masterchain EULA consent gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function renderControl(live: boolean) {
    vi.stubEnv("NEXT_PUBLIC_EULA_LIVE", live ? "1" : "");
    const { MasterchainPurchaseControl } = await import(
      "@/components/features/muedsp-landing/masterchain-purchase-control"
    );
    return render(<MasterchainPurchaseControl {...props} />);
  }

  it("keeps Buy disabled until consent, then opens checkout with explicit acceptance", async () => {
    await renderControl(true);

    const checkbox = screen.getByRole("checkbox", { name: /I have read and agree to the EULA/i });
    const button = screen.getByRole("button", { name: "Buy" });
    expect(screen.getByRole("link", { name: "EULA" })).toHaveAttribute("href", "/en/eula");
    expect(button).toBeDisabled();

    await waitFor(() => expect(loadCheckoutScript).toHaveBeenCalledTimes(1));
    fireEvent.click(checkbox);
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(openCheckout).toHaveBeenCalledWith({ eulaAccepted: true });
  });

  it("stays fail-closed and renders no EULA link while the client gate is staged", async () => {
    await renderControl(false);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "EULA" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy" })).toBeDisabled();
    expect(loadCheckoutScript).not.toHaveBeenCalled();
    expect(openCheckout).not.toHaveBeenCalled();
  });
});
