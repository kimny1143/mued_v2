import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";

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

import { MasterchainPurchaseControl } from "@/components/features/muedsp-landing/masterchain-purchase-control";

const props = {
  locale: "en",
  buyLabel: "Buy",
  consentPrefix: "I have read and agree to the",
  eulaLabel: "EULA",
  eulaLive: true,
};

describe("masterchain EULA consent gate", () => {
  it("keeps Buy disabled until consent, then opens checkout with explicit acceptance", async () => {
    render(<MasterchainPurchaseControl {...props} />);

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

  it("stays fail-closed while the EULA is staged", () => {
    render(<MasterchainPurchaseControl {...props} eulaLive={false} />);

    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Buy" })).toBeDisabled();
    expect(loadCheckoutScript).not.toHaveBeenCalled();
    expect(openCheckout).not.toHaveBeenCalled();
  });
});
