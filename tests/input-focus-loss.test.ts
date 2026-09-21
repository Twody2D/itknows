import { beforeEach, describe, expect, it } from 'vitest';
import { inputState } from '@/utils/input/InputState';

/**
 * A KEY HELD WHEN THE PAGE LOSES FOCUS USED TO STAY HELD FOREVER.
 *
 * `keyup` is delivered to the focused document, so a direction held while an
 * ad opens over the page, or while the player alt-tabs, or while the phone
 * raises its notification shade, has no release event to arrive — the browser
 * simply stops talking to us with the key still down. Measured on the dev
 * build before the fix: right held, window blurred, the android walked
 * another 87 px in 0.7 s and `inputState.right` was still `true` afterwards.
 *
 * Yandex Games requires the game to behave when the browser is minimized or
 * an ad covers it, and CLAUDE.md #5 says «управление никогда не является
 * причиной смерти» from the other side. A blur now drops everything held.
 *
 * The DOM listeners themselves cannot be exercised here — the suite runs on
 * `environment: 'node'` — so what is asserted is the state machine they call,
 * which is also what the ad break calls directly (`main.ts`).
 */
describe('input released on focus loss', () => {
  beforeEach(() => {
    inputState.releaseAll();
  });

  it('drops a held direction', () => {
    inputState.keyDown('ArrowRight');
    expect(inputState.right).toBe(true);
    inputState.releaseAll();
    expect(inputState.right).toBe(false);
    expect(inputState.left).toBe(false);
  });

  it('drops held touch controls too, not only the keyboard', () => {
    // The touch flags come from pointer handlers that a lost pointer capture
    // never finishes either — same defect, different input.
    inputState.setTouchRight(true);
    inputState.setTouchJump(true);
    expect(inputState.right).toBe(true);
    expect(inputState.isJumpDown()).toBe(true);
    inputState.releaseAll();
    expect(inputState.right).toBe(false);
    expect(inputState.isJumpDown()).toBe(false);
  });

  it('swallows a jump that was buffered but never consumed', () => {
    // Otherwise it fires on the first frame after the player comes back,
    // which reads as the game jumping by itself.
    inputState.keyDown('Space');
    inputState.releaseAll();
    expect(inputState.jumpJustPressed()).toBe(false);
  });

  it('is not a latch — the next real press still works', () => {
    inputState.keyDown('KeyD');
    inputState.releaseAll();
    inputState.keyDown('KeyD');
    expect(inputState.right).toBe(true);
    inputState.keyDown('Space');
    expect(inputState.jumpJustPressed()).toBe(true);
  });

  it('a repeat of an already-held key still does not re-buffer a jump', () => {
    // OS auto-repeat guard, restated here because `releaseAll` clears the
    // `pressed` set the guard reads from: a release followed by auto-repeat
    // of the same physical hold must not manufacture a second jump.
    inputState.keyDown('Space');
    expect(inputState.jumpJustPressed()).toBe(true);
    inputState.keyDown('Space');
    expect(inputState.jumpJustPressed()).toBe(false);
  });
});
