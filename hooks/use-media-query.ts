"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if a media query matches
 * Returns undefined during SSR/hydration to prevent hydration mismatch
 * @param query - CSS media query string (e.g., "(min-width: 1024px)")
 * @returns boolean | undefined - undefined during hydration, then true/false
 */
export function useMediaQuery(query: string): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Set initial value after mount
    setMatches(mediaQuery.matches);

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}

/**
 * Convenience hook for detecting desktop (lg breakpoint: 1024px)
 * Returns undefined during hydration
 */
export function useIsDesktop(): boolean | undefined {
  return useMediaQuery("(min-width: 1024px)");
}

/**
 * Convenience hook for detecting mobile (below lg breakpoint)
 * Returns undefined during hydration
 */
export function useIsMobile(): boolean | undefined {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  return isDesktop === undefined ? undefined : !isDesktop;
}
