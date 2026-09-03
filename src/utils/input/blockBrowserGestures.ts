/**
 * Prevents context menus, text selection, drag-and-drop, page scroll and
 * double-tap zoom from leaking into the game surface (CLAUDE.md #Phase 0).
 * Must run once before the Phaser game boots.
 */
export function blockBrowserGestures(root: HTMLElement): void {
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  root.addEventListener('selectstart', (e) => e.preventDefault());
  root.addEventListener('dragstart', (e) => e.preventDefault());

  root.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
    },
    { passive: false },
  );

  root.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  let lastTouchEnd = 0;
  root.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false },
  );

  document.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) e.preventDefault();
    },
    { passive: false },
  );

  document.addEventListener('gesturestart', (e) => e.preventDefault());
}
