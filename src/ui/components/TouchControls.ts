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
    { key: 'left', radius: 22, color: PALETTE.white },
    { key: 'right', radius: 22, color: PALETTE.white },
    { key: 'jump', radius: 26, color: PALETTE.cyan },
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

  private layout(): void {
    const { width, height } = this.scene.scale;
    const margin = 16;

    const left = this.zones.get('left');
    const right = this.zones.get('right');
    const jump = this.zones.get('jump');

    left?.setPosition(margin + 22, height - margin - 22);
    right?.setPosition(margin + 22 + 52, height - margin - 22);
    jump?.setPosition(width - margin - 26, height - margin - 26);

    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    for (const def of this.buttons) {
      const zone = this.zones.get(def.key);
      if (!zone) continue;
      const isPressed = this.pressed.has(def.key);
      this.graphics.fillStyle(def.color, isPressed ? 0.35 : 0.16);
      this.graphics.fillCircle(zone.x, zone.y, def.radius);
      this.graphics.lineStyle(2, def.color, isPressed ? 0.9 : 0.5);
      this.graphics.strokeCircle(zone.x, zone.y, def.radius);
    }
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
    this.input.setTouchDash(false);

    this.graphics.destroy();
    for (const zone of this.zones.values()) zone.destroy();
  }
}
