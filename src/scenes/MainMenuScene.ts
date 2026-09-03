import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { getAllLevels } from '@/gameplay/LevelFactory';

/**
 * Functional vertical-slice menu. Visual polish (animated logo, living
 * character, terminal panels) is Phase 4 (CLAUDE.md #Phase 4) — this only
 * has to let a player start the game and read as intentional, not broken.
 */
export class MainMenuScene extends Phaser.Scene {
  private particles: { x: number; y: number; speed: number; alpha: number }[] = [];
  private graphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bgVoid);
    this.graphics = this.add.graphics();

    const { width, height } = this.scale;
    this.particles = Array.from({ length: 24 }, () => ({
      x: Phaser.Math.Between(0, width),
      y: Phaser.Math.Between(0, height),
      speed: Phaser.Math.FloatBetween(3, 10),
      alpha: Phaser.Math.FloatBetween(0.15, 0.5),
    }));

    const title = this.add
      .text(width / 2, height * 0.32, 'IT KNOWS', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: hexToCss(PALETTE.white),
      })
      .setOrigin(0.5)
      .setShadow(0, 0, hexToCss(PALETTE.cyan), 8, true, true);

    this.add
      .text(width / 2, height * 0.32 + 22, 'SYSTEM ONLINE', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: hexToCss(PALETTE.system),
      })
      .setOrigin(0.5);

    const playButton = this.add
      .text(width / 2, height * 0.58, 'PLAY', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: hexToCss(PALETTE.cyan),
      })
      .setOrigin(0.5)
      .setPadding(16, 8, 16, 8)
      .setInteractive({ useHandCursor: true });

    playButton.on('pointerover', () => playButton.setColor(hexToCss(PALETTE.white)));
    playButton.on('pointerout', () => playButton.setColor(hexToCss(PALETTE.cyan)));
    playButton.on('pointerdown', () => {
      const firstLevel = getAllLevels()[0];
      if (firstLevel) this.scene.start('GameplayScene', { levelId: firstLevel.id });
    });

    this.tweens.add({ targets: title, alpha: { from: 0, to: 1 }, duration: 500 });

    this.scale.on('resize', () => this.layoutParticleBounds());
  }

  private layoutParticleBounds(): void {
    const { width } = this.scale;
    for (const p of this.particles) {
      if (p.x > width) p.x = Phaser.Math.Between(0, width);
    }
  }

  override update(_time: number, delta: number): void {
    const { width, height } = this.scale;
    this.graphics.clear();
    this.graphics.fillStyle(PALETTE.cyan, 1);

    for (const p of this.particles) {
      p.y -= (p.speed * delta) / 1000;
      if (p.y < -2) {
        p.y = height + 2;
        p.x = Phaser.Math.Between(0, width);
      }
      this.graphics.fillStyle(PALETTE.cyan, p.alpha);
      this.graphics.fillRect(p.x, p.y, 1, 1);
    }
  }
}
