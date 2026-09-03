const LEFT_CODES = new Set(['KeyA', 'ArrowLeft']);
const RIGHT_CODES = new Set(['KeyD', 'ArrowRight']);
const JUMP_CODES = new Set(['Space', 'ArrowUp', 'KeyW']);
const DASH_CODES = new Set(['ShiftLeft', 'ShiftRight', 'KeyX']);

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
 */
class InputStateController {
  private pressed = new Set<string>();

  private touchLeft = false;
  private touchRight = false;
  private touchJumpDown = false;
  private touchDashDown = false;

  private jumpBuffered = false;
  private dashBuffered = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (this.pressed.has(e.code)) return; // ignore OS auto-repeat
      this.pressed.add(e.code);
      if (JUMP_CODES.has(e.code)) this.jumpBuffered = true;
      if (DASH_CODES.has(e.code)) this.dashBuffered = true;
    });
    window.addEventListener('keyup', (e) => {
      this.pressed.delete(e.code);
    });
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

  setTouchDash(down: boolean): void {
    this.touchDashDown = down;
    if (down) this.dashBuffered = true;
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

  isDashDown(): boolean {
    return this.hasAny(DASH_CODES) || this.touchDashDown;
  }

  /** Consumes the buffered jump press — returns true at most once per press. */
  jumpJustPressed(): boolean {
    if (!this.jumpBuffered) return false;
    this.jumpBuffered = false;
    return true;
  }

  /** Consumes the buffered dash press — returns true at most once per press. */
  dashJustPressed(): boolean {
    if (!this.dashBuffered) return false;
    this.dashBuffered = false;
    return true;
  }
}

export type InputState = InputStateController;

/** Single shared instance — see class doc comment for why this must not be per-scene. */
export const inputState: InputState = new InputStateController();
