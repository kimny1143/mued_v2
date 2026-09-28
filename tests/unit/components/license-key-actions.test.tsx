import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LicenseKeyActions } from "@/components/features/license/license-key-actions";

const KEY = "MUEDSP-LICENSE-v2\nowner=音楽@example.com\nsig=exact-bytes";
const labels = {
  label: "License key", copyLabel: "Copy key", copiedLabel: "Copied",
  failedLabel: "Could not copy. Select the key and copy it manually.",
  downloadLabel: "Download license.key",
};

afterEach(() => vi.unstubAllGlobals());

describe("LicenseKeyActions", () => {
  it.each([KEY, `${KEY}\n`, `${KEY}\r\n`])("copies the original key verbatim (%j)", async (licenseKey) => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<LicenseKeyActions licenseKey={licenseKey} {...labels} />);
    expect(document.querySelector("pre")?.textContent).toBe(licenseKey);
    fireEvent.click(screen.getByRole("button", { name: "Copy key" }));
    await screen.findByRole("button", { name: "Copied" });
    expect(writeText).toHaveBeenCalledExactlyOnceWith(licenseKey);
  });

  it("keeps the selectable key and manual-copy fallback when clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    render(<LicenseKeyActions licenseKey={KEY} {...labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy key" }));
    await screen.findByText(labels.failedLabel);
    expect(document.querySelector("pre")).toHaveClass("select-text");
    expect(document.querySelector("pre")?.textContent).toBe(KEY);
    expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
  });

  it.each([KEY, `${KEY}\n`, `${KEY}\r\n`])("downloads exact UTF-8 bytes without adding a BOM or newline (%j)", async (licenseKey) => {
    const createObjectURL = vi.fn(() => "blob:license-key");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("license.key");
      expect(this.getAttribute("href")).toBe("blob:license-key");
      expect(this.isConnected).toBe(true);
      expect(revokeObjectURL).not.toHaveBeenCalled();
    });
    render(<LicenseKeyActions licenseKey={licenseKey} {...labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Download license.key" }));
    expect(click).toHaveBeenCalledTimes(1);
    // ★Deferred: revoking synchronously can cancel the download in Safari.
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (createObjectURL.mock.calls as unknown as [Blob][])[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/plain");
    // jsdom's Blob has no .text(); read the actual Blob with FileReader instead.
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(text).toBe(licenseKey);
    // FileReader can strip a BOM. Size equality also rules out those extra bytes.
    expect(blob.size).toBe(new TextEncoder().encode(licenseKey).length);
    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:license-key"), { timeout: 2500 });
    expect(document.querySelector('a[download="license.key"]')).toBeNull();
  });
});
