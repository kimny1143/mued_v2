import type { AnchorHTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductLink } from "@/components/brand/product-link";
import { trackCtaClick } from "@/lib/analytics/gtag";
import { LocaleProvider, useLocale } from "@/lib/i18n/locale-context";

vi.mock("next/link", () => ({
  default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}));
vi.unmock("@/lib/i18n/locale-context");
vi.mock("@/lib/analytics/gtag", () => ({ trackCtaClick: vi.fn() }));

function LocaleProbe() {
  const { locale, setLocale } = useLocale();
  return <button onClick={() => setLocale("en")}>{locale}</button>;
}

describe("studio review and live navigation", () => {
  it.each([false, true])(
    "preview=%s keeps links usable and controls analytics",
    (preview) => {
      render(
        <ProductLink
          href="#product"
          product="muedsp"
          location="portal_master"
          preview={preview}
        >
          Master
        </ProductLink>,
      );
      const link = screen.getByRole("link", { name: "Master" });
      expect(link).toHaveAttribute("href", "#product");
      fireEvent.click(link);
      if (preview) expect(trackCtaClick).not.toHaveBeenCalled();
      else
        expect(trackCtaClick).toHaveBeenCalledWith(
          "muedsp",
          "portal_master",
          "internal_page",
        );
    },
  );

  it("preserves the App Store destination in live analytics", () => {
    render(
      <ProductLink
        href="#store"
        product="muedear"
        location="portal_train"
        external
      >
        Train
      </ProductLink>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Train" }));
    expect(trackCtaClick).toHaveBeenCalledWith(
      "muedear",
      "portal_train",
      "app_store",
    );
  });

  it("uses the review URL locale over saved preferences, and still permits switching", () => {
    localStorage.setItem("locale", "en");
    render(
      <LocaleProvider initialLocale="ja">
        <LocaleProbe />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "ja" }));
    expect(screen.getByRole("button", { name: "en" })).toBeInTheDocument();
    expect(localStorage.getItem("locale")).toBe("en");
    localStorage.removeItem("locale");
  });

  it("preserves the ordinary dashboard's saved-language behavior", () => {
    localStorage.setItem("locale", "ja");
    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "ja" })).toBeInTheDocument();
    localStorage.removeItem("locale");
  });
});
