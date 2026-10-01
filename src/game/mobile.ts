export function isTouchDevice(): boolean {
  const primaryTouch = window.matchMedia('(pointer: coarse)').matches;
  const mobileAgent = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
  const desktopIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  // A mouse-first touchscreen laptop still defaults to PC controls. Phones,
  // tablets and desktop-UA iPads get automatic controls instead.
  return primaryTouch || (navigator.maxTouchPoints > 0 && (mobileAgent || desktopIPad));
}

export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };

// Both features are best-effort: iOS, embedded previews and some Android
// browsers deny them. The rotation overlay remains the reliable fallback.
export async function enterMobileLandscape(): Promise<boolean> {
  let ownsFullscreen = false;
  try {
    if (!document.fullscreenElement && document.fullscreenEnabled) {
      await document.documentElement.requestFullscreen();
      ownsFullscreen = true;
    }
  } catch { /* Unsupported or blocked by the embedding browser. */ }
  try {
    await (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape');
  } catch { /* Users can always rotate the device manually. */ }
  return ownsFullscreen;
}

export function releaseMobileLandscape(ownsFullscreen: boolean) {
  try { screen.orientation?.unlock?.(); } catch { /* Best-effort cleanup. */ }
  if (ownsFullscreen && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
}
