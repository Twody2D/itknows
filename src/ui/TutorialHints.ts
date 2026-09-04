import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { PixelLabel } from '@/ui/PixelLabel';
import { buildKeyRow } from '@/ui/KeyCap';
import { isTouchDevice } from '@/utils/input/isTouchDevice';
import { t } from '@/i18n/ui';
import { EventBus } from '@/core/EventBus';
import type { InputState } from '@/utils/input/InputState';
import type { Player } from '@/gameplay/Player';

/** How long a hint stays up after the player first performs it. */
const LINGER_MS = 1900;
const FADE_MS = 550;

/**
 * A phone player has thumb buttons, not a keyboard, so they're shown the
 * buttons that are actually on their screen — telling them to press D would
 * be teaching a control they don't have.
 */
export const moveHintKeys = (): Parameters<typeof buildKeyRow>[3] =>
  isTouchDevice()
    ? [{ touch: 'left' }, { touch: 'right' }]
    : [{ text: 'A' }, { text: 'D' }, { separator: t('hintOr') }, { symbol: 'arrow-left' }, { symbol: 'arrow-right' }];

export const jumpHintKeys = (): Parameters<typeof buildKeyRow>[3] =>
  isTouchDevice() ? [{ touch: 'up' }] : [{ text: 'W' }, { symbol: 'space' }, { symbol: 'arrow-up' }];

/**
 * First-attempt contextual prompts shown directly over Level 01 — "move this
 * way", then "jump" right as the first gap comes into view — instead of
 * teaching controls only on a separate How to Play screen the player has to
 * seek out before ever touching the level.
 *
 * Each hint draws the actual keys as keycaps and shows *every* binding that
 * works, not one of them: a player who reaches for the arrow keys or W should
 * not be told the control is "Space". After the taught input first happens
 * the hint lingers, then fades — vanishing on the first frame of movement
 * read as a glitch, and gave no time to notice the other bindings.
 *
 * Nothing here blocks input or changes level geometry/timing (CLAUDE.md #4.1).
 */
class Hint {
  private readonly root: Phaser.GameObjects.Container;
  private dismissing = false;

  constructor(
    private readonly scene: Phaser.Scene,
    caption: string,
    keys: Parameters<typeof buildKeyRow>[3],
  ) {
    this.root = scene.add.container(0, 0).setDepth(500).setAlpha(0);

    const label = new PixelLabel(scene, 0, -12, caption, {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    });
    label.setOrigin(0.5, 1);
    this.root.add(label);
    this.root.add(buildKeyRow(scene, 0, 0, keys));

    scene.tweens.add({ targets: this.root, alpha: 1, duration: 220 });
  }

  /** Repositions the hint above the player, clamped to stay fully on-screen near a camera edge. */
  place(player: Player, camera: Phaser.Cameras.Scene2D.Camera): void {
    if (!this.root.active) return;
    const view = camera.worldView;
    const x = Phaser.Math.Clamp(player.x, view.x + 44, view.x + view.width - 44);
    // Clears the top of the player's head (sprite is 36px tall, bottom-
    // anchored at player.y) with room to spare — VISUAL RESET v1 made the
    // character much taller, and this hint used to sit right on top of it.
    this.root.setPosition(Math.round(x), Math.round(player.y - 50));
  }

  /** True once the taught input has happened — the hint is fading out or gone. */
  get done(): boolean {
    return this.dismissing;
  }

  dismiss(): void {
    if (this.dismissing) return;
    this.dismissing = true;
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      delay: LINGER_MS,
      duration: FADE_MS,
      onComplete: () => this.destroy(),
    });
  }

  /** Cuts the linger/fade short and removes the hint immediately — used when the player has moved into the next hint's zone and the two would otherwise overlap on screen. */
  forceDismiss(): void {
    if (!this.root.active) return;
    this.scene.tweens.killTweensOf(this.root);
    this.destroy();
  }

  destroy(): void {
    this.root.destroy();
  }
}

export class TutorialHints {
  private moveHint: Hint | undefined;
  private jumpHint: Hint | undefined;
  private jumpHintArmed = false;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private input: InputState,
    private jumpTriggerX: number,
  ) {
    this.moveHint = new Hint(this.scene, t('hintMove'), moveHintKeys());
    EventBus.on('player:jumped', this.onJumped, this);
  }

  private onJumped(): void {
    this.jumpHint?.dismiss();
  }

  update(): void {
    const camera = this.scene.cameras.main;

    if (this.moveHint) {
      this.moveHint.place(this.player, camera);
      if (this.input.left || this.input.right) this.moveHint.dismiss();
    }

    // The jump hint's zone starts at `jumpTriggerX` — crossing into it force-
    // dismisses whatever's left of the move hint on the spot instead of
    // waiting out its linger/fade, which is what let the two overlap on
    // screen (the move hint could still be mid-fade when the jump hint spawned).
    if (!this.jumpHintArmed && this.player.x >= this.jumpTriggerX) {
      this.jumpHintArmed = true;
      this.moveHint?.forceDismiss();
      this.moveHint = undefined;
      this.jumpHint = new Hint(this.scene, t('hintJump'), jumpHintKeys());
    }

    this.jumpHint?.place(this.player, camera);
  }

  destroy(): void {
    EventBus.off('player:jumped', this.onJumped, this);
    this.moveHint?.destroy();
    this.jumpHint?.destroy();
  }
}
