/**
 * Puts the game fullscreen on a phone, once, on the first touch.
 *
 * Yandex Games requirement 1.6.1.1 for mobile: «Игра находится в
 * полноэкранном режиме во время игрового процесса или запуска.» Nothing in
 * this game ever asked for it — the portal's own chrome is all that was
 * hiding the browser UI, and outside the portal (a direct link, the
 * preview build) the address bar simply stayed.
 *
 * Three things make this safe to do unprompted:
 *
 *  - It only fires on a coarse pointer. Requirement 1.6.2 gives desktop its
 *    own rules and a desktop player who did not ask for fullscreen would
 *    rightly read it as the page seizing their screen.
 *  - It only fires from a real user gesture, because `requestFullscreen`
 *    rejects anywhere else. The first touch anywhere on the game is that
 *    gesture, so the player never has to press a button whose only job is
 *    to satisfy the browser.
 *  - It only fires once, whether it worked or not. A request that the
 *    platform refuses — an iframe without `allow="fullscreen"`, iOS Safari,
 *    a user who left fullscreen on purpose — must not be retried on every
 *    subsequent tap, which would be a page fighting its own player.
 */
export function requestFullscreenOnFirstGesture(element: HTMLElement): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!window.matchMedia?.('(pointer: coarse)').matches) return;

  const target = document.documentElement ?? element;
  const attempt = (): void => {
    window.removeEventListener('pointerdown', attempt);
    window.removeEventListener('touchend', attempt);
    if (document.fullscreenElement) return;
    try {
      // Returns a promise that rejects rather than throwing when the
      // platform says no; both paths end the same way — nothing happens and
      // the game carries on windowed.
      void target.requestFullscreen?.({ navigationUI: 'hide' })?.catch(() => undefined);
    } catch {
      /* no fullscreen here — never a reason to break boot */
    }
  };

  // `pointerdown` covers every touch browser we support; `touchend` is the
  // fallback for the ones that only treat a completed tap as a gesture.
  window.addEventListener('pointerdown', attempt, { once: true });
  window.addEventListener('touchend', attempt, { once: true });
}
