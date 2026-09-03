/**
 * Whether the primary pointer on this device is touch. Used to hide
 * `TouchControls` on desktop (CLAUDE.md #Yandex 1.6.2 — mouse/keyboard by
 * default, no on-screen clutter) while keeping mobile fully gesture-driven
 * (CLAUDE.md #Yandex 1.6.1.5).
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(pointer: coarse)').matches) return true;
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
}
