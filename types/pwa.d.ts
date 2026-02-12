/**
 * BeforeInstallPromptEvent
 *
 * Chrome/Edge PWA install prompt event.
 * Not in standard TypeScript lib.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export {};
