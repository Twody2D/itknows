import Phaser from 'phaser';

/**
 * Merges keyboard and touch button sources into one frame-stable state.
 * Gameplay code reads only this — it never touches Phaser input directly.
 */
export class InputState {
  private leftKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;
  private jumpKeys: Phaser.Input.Keyboard.Key[] = [];
  private dashKeys: Phaser.Input.Keyboard.Key[] = [];

  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;
  private touchDash = false;

  private jumpWasDown = false;
  private dashWasDown = false;

  private jumpPressedThisFrame = false;
  private dashPressedThisFrame = false;

  private extraLeftKeys: Phaser.Input.Keyboard.Key[] = [];
  private extraRightKeys: Phaser.Input.Keyboard.Key[] = [];

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      this.leftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.rightKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      const leftArrow = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      const rightArrow = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
      this.jumpKeys = [
        kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      ];
      this.dashKeys = [
        kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      ];
      this.extraLeftKeys = [leftArrow];
      this.extraRightKeys = [rightArrow];
    }
  }

  setTouchLeft(down: boolean): void {
    this.touchLeft = down;
  }

  setTouchRight(down: boolean): void {
    this.touchRight = down;
  }

  setTouchJump(down: boolean): void {
    this.touchJump = down;
  }

  setTouchDash(down: boolean): void {
    this.touchDash = down;
  }

  /** Must run once per frame before reading justPressed state. */
  update(): void {
    const jumpDown = this.isJumpDown();
    this.jumpPressedThisFrame = jumpDown && !this.jumpWasDown;
    this.jumpWasDown = jumpDown;

    const dashDown = this.isDashDown();
    this.dashPressedThisFrame = dashDown && !this.dashWasDown;
    this.dashWasDown = dashDown;
  }

  get left(): boolean {
    return Boolean(this.leftKey?.isDown) || this.extraLeftKeys.some((k) => k.isDown) || this.touchLeft;
  }

  get right(): boolean {
    return Boolean(this.rightKey?.isDown) || this.extraRightKeys.some((k) => k.isDown) || this.touchRight;
  }

  isJumpDown(): boolean {
    return this.jumpKeys.some((k) => k.isDown) || this.touchJump;
  }

  isDashDown(): boolean {
    return this.dashKeys.some((k) => k.isDown) || this.touchDash;
  }

  jumpJustPressed(): boolean {
    return this.jumpPressedThisFrame;
  }

  dashJustPressed(): boolean {
    return this.dashPressedThisFrame;
  }
}
