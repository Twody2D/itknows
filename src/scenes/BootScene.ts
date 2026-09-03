import Phaser from 'phaser';
import { generateAllTextures } from '@/art/SpriteFactory';

/**
 * No asset files are ever loaded (CLAUDE.md #3) — this scene generates every
 * texture procedurally on an offscreen canvas before the menu appears.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    generateAllTextures(this);
    this.scene.start('MainMenuScene');
  }
}
