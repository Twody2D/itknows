import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import type { InputState } from '@/utils/input/InputState';

interface ButtonDef {
  key: 'left' | 'right' | 'jump';
  radius: number;
  color: number;
}

/**
 * Large, semi-transparent thumb buttons drawn procedurally and pinned to the
 * viewport (scrollFactor 0) so they stay put across every aspect ratio.
 * Visual-only layer; actual state flows into InputState via pointer events.
 */
export class TouchControls {
  private scene: Phaser.Scene;
  private input: InputState;
  private graphics: Phaser.GameObjects.Graphics;
  private zones = new Map<ButtonDef['key'], Phaser.GameObjects.Zone>();
  private pressed = new Set<ButtonDef['key']>();

  private readonly buttons: ButtonDef[] = [
    { key: 'left', radius: 20, color: PALETTE.white },
    { key: 'right', radius: 20, color: PALETTE.white },
    { key: 'jump', radius: 24, color: PALETTE.cyan },
  ];

  constructor(scene: Phaser.Scene, input: InputState) {
    this.scene = scene;
    this.input = input;
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(1000);

    for (const def of this.buttons) {
      const zone = scene.add
        .zone(0, 0, def.radius * 2, def.radius * 2)
        .setScrollFactor(0)
        .setDepth(1001)
        .setInteractive({ useHandCursor: false });

      zone.on('pointerdown', () => this.setPressed(def.key, true));
      zone.on('pointerup', () => this.setPressed(def.key, false));
      zone.on('pointerout', () => this.setPressed(def.key, false));
      zone.on('pointerupoutside', () => this.setPressed(def.key, false));

      this.zones.set(def.key, zone);
    }

    this.layout();
    scene.scale.on('resize', () => this.layout());
  }

  private setPressed(key: ButtonDef['key'], down: boolean): void {
    if (down) this.pressed.add(key);
    else this.pressed.delete(key);

    if (key === 'left') this.input.setTouchLeft(down);
    if (key === 'right') this.input.setTouchRight(down);
    if (key === 'jump') this.input.setTouchJump(down);

    this.draw();
  }

  /**
   * Pinned hard into the bottom corners. They used to sit inset from the
   * edges, which put them right on top of the player — the character stands
   * near the bottom of the screen, so anything with a margin under it lands on
   * the action. In the corners they frame the play area instead of covering it.
   */
  private layout(): void {
    const { width, height } = this.scene.scale;
    const margin = 6;

    const left = this.zones.get('left');
    const right = this.zones.get('right');
    const jump = this.zones.get('jump');

    left?.setPosition(margin + 20, height - margin - 20);
    right?.setPosition(margin + 20 + 46, height - margin - 20);
    jump?.setPosition(width - margin - 24, height - margin - 24);

    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    for (const def of this.buttons) {
      const zone = this.zones.get(def.key);
      if (!zone) continue;
      const isPressed = this.pressed.has(def.key);
      // Faint at rest so the level reads through them; unmistakable when held.
      this.graphics.fillStyle(def.color, isPressed ? 0.3 : 0.08);
      this.graphics.fillCircle(zone.x, zone.y, def.radius);
      this.graphics.lineStyle(1, def.color, isPressed ? 0.9 : 0.32);
      this.graphics.strokeCircle(zone.x, zone.y, def.radius);
      this.drawGlyph(def, zone.x, zone.y, isPressed);
    }
  }

  /** A chevron per button, so the controls say what they do without a legend. */
  private drawGlyph(def: ButtonDef, x: number, y: number, pressed: boolean): void {
    const g = this.graphics;
    g.fillStyle(def.color, pressed ? 1 : 0.5);

    if (def.key === 'jump') {
      for (let i = 0; i < 4; i++) g.fillRect(Math.round(x - i - 0.5), Math.round(y - 3 + i), i * 2 + 1, 1);
      g.fillRect(Math.round(x - 1), Math.round(y + 1), 2, 4);
      return;
    }

    const dir = def.key === 'left' ? -1 : 1;
    for (let i = 0; i < 4; i++) {
      g.fillRect(Math.round(x + dir * (3 - i)) - (dir < 0 ? 1 : 0), Math.round(y - i - 0.5), 1, i * 2 + 1);
    }
    g.fillRect(Math.round(x - dir * 4), Math.round(y - 1), 4, 2);
  }

  setVisible(visible: boolean): void {
    this.graphics.setVisible(visible);
    for (const zone of this.zones.values()) {
      zone.setActive(visible);
      if (zone.input) zone.input.enabled = visible;
    }
  }

  destroy(): void {
    // A finger can still be down when the scene tears down mid-transition
    // (e.g. landing on the exit with a thumb on the jump button) — release
    // every button explicitly so the shared InputState never gets stuck
    // reporting a held input nothing can ever release again.
    this.input.setTouchLeft(false);
    this.input.setTouchRight(false);
    this.input.setTouchJump(false);

    this.graphics.destroy();
    for (const zone of this.zones.values()) zone.destroy();
  }
}
