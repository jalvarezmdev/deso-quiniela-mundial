import { useMemo } from "react";
import { useMediaQuery } from "react-responsive";

export const SCREEN_BREAKPOINTS = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1023,
  desktopMin: 1024,
} as const;

export type ScreenSize = "mobile" | "tablet" | "desktop";

export function useScreenSize() {
  const isMobile = useMediaQuery({ maxWidth: SCREEN_BREAKPOINTS.mobileMax });
  const isTablet = useMediaQuery({
    minWidth: SCREEN_BREAKPOINTS.tabletMin,
    maxWidth: SCREEN_BREAKPOINTS.tabletMax,
  });
  const isDesktop = useMediaQuery({ minWidth: SCREEN_BREAKPOINTS.desktopMin });

  const screenSize = useMemo<ScreenSize>(() => {
    if (isDesktop) return "desktop";
    if (isTablet) return "tablet";
    return "mobile";
  }, [isDesktop, isTablet]);

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenSize,
  };
}
