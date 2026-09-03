import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { PixelLabel } from '@/ui/PixelLabel';
import { t } from '@/i18n/ui';
import { EventBus } from '@/core/EventBus';
import type { InputState } from '@/utils/input/InputState';
import type { Player } from '@/gameplay/Player';

/**
 * First-attempt contextual prompts shown directly over Level 01 — "move
 * this way", then "jump" right as the first gap comes into view — instead of
 * teaching controls only on a separate How to Play screen the player has to
 * seek out before ever touching the level. Each hint follows the player and
 * dismisses itself the moment the taught input actually happens; nothing
 * here blocks input or changes level geometry/timing (CLAUDE.md #4.1).
 */
export class TutorialHints {
  private moveHint: PixelLabel | undefined;
  private jumpHint: PixelLabel | undefined;
  private jumpHintArmed = false;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private input: InputState,
    private jumpTriggerX: number,
  ) {
    this.moveHint = this.makeHint(t('hintMove'));
    EventBus.on('player:jumped', this.onJumped, this);
  }

  private makeHint(text: string): PixelLabel {
    const label = new PixelLabel(this.scene, this.player.x, this.player.y - 18, text, {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    });
    label.setOrigin(0.5, 1);
    label.setDepth(500);
    label.setAlpha(0);
    this.scene.tweens.add({ targets: label, alpha: 1, duration: 200 });
    return label;
  }

  /** Keeps the label fully on-screen even when it follows the player near a camera edge (e.g. right at level spawn). */
  private placeAbovePlayer(label: PixelLabel): void {
    const view = this.scene.cameras.main.worldView;
    const halfWidth = label.width / 2;
    const x = Phaser.Math.Clamp(this.player.x, view.x + halfWidth, view.x + view.width - halfWidth);
    label.setPosition(x, this.player.y - 18);
  }

  private onJumped(): void {
    if (!this.jumpHint) return;
    this.jumpHint.destroy();
    this.jumpHint = undefined;
  }

  update(): void {
    if (this.moveHint) {
      this.placeAbovePlayer(this.moveHint);
      if (this.input.left || this.input.right) {
        this.moveHint.destroy();
        this.moveHint = undefined;
      }
    }

    if (!this.jumpHintArmed && !this.moveHint && this.player.x >= this.jumpTriggerX) {
      this.jumpHintArmed = true;
      this.jumpHint = this.makeHint(t('hintJump'));
    }

    if (this.jumpHint) {
      this.placeAbovePlayer(this.jumpHint);
    }
  }

  destroy(): void {
    EventBus.off('player:jumped', this.onJumped, this);
    this.moveHint?.destroy();
    this.jumpHint?.destroy();
  }
}
