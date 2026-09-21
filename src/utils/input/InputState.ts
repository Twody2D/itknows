const LEFT_CODES = new Set(['KeyA', 'ArrowLeft']);
const RIGHT_CODES = new Set(['KeyD', 'ArrowRight']);
const JUMP_CODES = new Set(['Space', 'ArrowUp', 'KeyW']);

/**
 * Merges keyboard and touch button sources into one state. Gameplay code
 * reads only this — it never touches Phaser input directly.
 *
 * This listens on `window` directly instead of using Phaser's per-scene
 * `Key` objects. Phaser tears down and recreates its Keyboard plugin (and
 * every `Key` it created) on every scene restart/transition — which this
 * game does on every death and every level change. A `Key` created fresh
 * has `isDown = false` until the browser fires a *new* keydown, so a player
 * holding a direction through a death would find movement silently frozen
 * until they released and re-pressed the key. A single instance that
 * outlives every scene avoids that entirely (module singleton `inputState`
 * below, exported like `EventBus`/`GameState`).
 *
 * "Just pressed" is event-driven, not polled once per rendered frame — a
 * press that starts and ends inside a single frame would otherwise never be
 * observed by a before/after comparison. A missed tap is an input bug, not
 * acceptable difficulty (CLAUDE.md #5 / #64).
 *
 * THE OTHER HALF OF LISTENING ON `window`: nothing else tells us the key
 * came back up. `keyup` fires at the focused document, so a key held while
 * the browser loses focus — an ad opening over the page, Alt-Tab, the phone's
 * notification shade, the task switcher — is pressed forever as far as this
 * is concerned. Measured on the dev build before this was fixed: right held,
 * window blurred, the android walked another 87 px in 0.7 s and `right`
 * stayed `true` with no key left to release. Yandex Games requires the game
 * to behave when the browser is minimized or an ad covers it, and «управление
 * никогда не является причиной смерти» (CLAUDE.md #5) says the same thing
 * from the other side. So every way the page can stop receiving key events
 * — `blur`, `pagehide`, a hidden document, a cancelled pointer — drops
 * everything held, and `releaseAll()` is public so the ad break can do it
 * explicitly too (`services/AdsService.ts`).
 */
class InputStateController {
  private pressed = new Set<string>();

  private touchLeft = false;
  private touchRight = false;
  private touchJumpDown = false;

  private jumpBuffered = false;

  constructor() {
    // Guarded so the module imports in a DOM-less environment (Vitest runs
    // `environment: 'node'`), which is what makes the state machine below
    // testable at all — see `tests/input-focus-loss.test.ts`.
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => this.keyDown(e.code));
    window.addEventListener('keyup', (e) => this.keyUp(e.code));
    window.addEventListener('blur', () => this.releaseAll());
    // `pagehide` rather than `unload`: mobile Safari/Chrome freeze a
    // backgrounded page instead of unloading it, and this is the event that
    // actually fires there.
    window.addEventListener('pagehide', () => this.releaseAll());
    window.addEventListener('pointercancel', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
  }

  /** The keyboard listener's body, exposed so the state machine is reachable without a DOM. */
  keyDown(code: string): void {
    if (this.pressed.has(code)) return; // ignore OS auto-repeat
    this.pressed.add(code);
    if (JUMP_CODES.has(code)) this.jumpBuffered = true;
  }

  keyUp(code: string): void {
    this.pressed.delete(code);
  }

  /**
   * Drops every held input, keyboard and touch alike, plus any jump that was
   * buffered but never consumed. Called whenever the page stops being able to
   * see the release that would otherwise arrive — see the class comment.
   *
   * The buffered jump goes too, deliberately: it would otherwise fire on the
   * frame after the player comes back, which reads as the game jumping by
   * itself.
   */
  releaseAll(): void {
    this.pressed.clear();
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJumpDown = false;
    this.jumpBuffered = false;
  }

  setTouchLeft(down: boolean): void {
    this.touchLeft = down;
  }

  setTouchRight(down: boolean): void {
    this.touchRight = down;
  }

  setTouchJump(down: boolean): void {
    this.touchJumpDown = down;
    if (down) this.jumpBuffered = true;
  }

  private hasAny(codes: Set<string>): boolean {
    for (const code of codes) {
      if (this.pressed.has(code)) return true;
    }
    return false;
  }

  get left(): boolean {
    return this.hasAny(LEFT_CODES) || this.touchLeft;
  }

  get right(): boolean {
    return this.hasAny(RIGHT_CODES) || this.touchRight;
  }

  isJumpDown(): boolean {
    return this.hasAny(JUMP_CODES) || this.touchJumpDown;
  }

  /** Consumes the buffered jump press — returns true at most once per press. */
  jumpJustPressed(): boolean {
    if (!this.jumpBuffered) return false;
    this.jumpBuffered = false;
    return true;
  }

}

export type InputState = InputStateController;

/** Single shared instance — see class doc comment for why this must not be per-scene. */
export const inputState: InputState = new InputStateController();
