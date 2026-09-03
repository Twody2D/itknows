import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { getAllLevels } from '@/gameplay/LevelFactory';
import { generatePlayerTextures } from '@/art/SpriteFactory';
import { buildEnvironmentLayers } from '@/art/Environment';
import { PixelLabel } from '@/ui/PixelLabel';
import { PixelButton } from '@/ui/PixelButton';
import { t } from '@/i18n/ui';

/**
 * Art-direction reset (see project history): a composed scene — layered
 * environment, a standing character, a real logo treatment, a shaped PLAY
 * control, one restrained SYSTEM signal — not a title floating on an empty
 * canvas with scattered particles. Visual polish is Phase 4 in the plan;
 * this only has to already read as "IT KNOWS", not a generic terminal demo.
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bgVoid);
    generatePlayerTextures(this);

    const { width, height } = this.scale;
    const floorY = height - 46;

    buildEnvironmentLayers(this, width, floorY + 20, 'main-menu', false);

    this.buildFloor(width, floorY);
    this.buildScanline(width, height);
    this.buildCharacter(width * 0.28, floorY);
    this.buildLogo(width);
    this.buildSystemLine(width);
    this.buildPlayButton(width, height);
  }

  private buildFloor(width: number, floorY: number): void {
    const g = this.add.graphics().setDepth(-5);
    g.fillStyle(PALETTE.metalDark, 1);
    g.fillRect(0, floorY, width, 200);
    g.fillStyle(PALETTE.metalEdge, 1);
    g.fillRect(0, floorY, width, 2);
    g.fillStyle(PALETTE.cyanDim, 0.6);
    g.fillRect(0, floorY, width, 1);

    for (let x = 20; x < width; x += 60) {
      g.fillStyle(PALETTE.metalMid, 0.5);
      g.fillRect(x, floorY + 4, 24, 1);
    }
  }

  private buildScanline(width: number, height: number): void {
    const line = this.add.graphics().setDepth(-2);
    line.fillStyle(PALETTE.system, 0.12);
    line.fillRect(0, 0, width, 1);

    this.tweens.add({
      targets: { y: 0 },
      y: height,
      duration: 5200,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const y = (tween.getValue() as number) ?? 0;
        line.setY(y);
      },
    });
  }

  private buildCharacter(x: number, floorY: number): void {
    const sprite = this.add.sprite(x, floorY, 'player-idle-0').setOrigin(0.5, 1).setScale(3.4);
    sprite.play('player-idle');
  }

  private buildLogo(width: number): void {
    const y = 46;
    const scale = 4;

    const title = new PixelLabel(this, width / 2, y, 'IT KNOWS', {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.outline),
      scale,
    });
    title.setOrigin(0.5, 0.5);
    title.postFX.addGlow(PALETTE.cyan, 0, 0, false, 0.3, 6);

    const underlineWidth = title.width + 24;
    const underlineY = y + title.height / 2 + 9;
    const underline = this.add.graphics().setDepth(title.depth);
    underline.fillStyle(PALETTE.cyanDim, 0.8);
    underline.fillRect(width / 2 - underlineWidth / 2, underlineY, underlineWidth, 1);
    underline.fillStyle(PALETTE.cyan, 1);
    underline.fillRect(width / 2 - underlineWidth / 2, underlineY, 8, 1);

    this.tweens.add({ targets: title, alpha: { from: 0, to: 1 }, duration: 500 });
    this.tweens.add({ targets: underline, alpha: { from: 0, to: 1 }, duration: 700, delay: 150 });
  }

  private buildSystemLine(width: number): void {
    const y = 84;
    const label = new PixelLabel(this, width / 2, y, 'SYSTEM ONLINE', {
      color: hexToCss(PALETTE.system),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    });
    label.setOrigin(0.5, 0.5);

    const marker = this.add.graphics().setDepth(label.depth);
    const markerX = width / 2 - label.width / 2 - 10;
    marker.lineStyle(1, PALETTE.system, 0.8);
    marker.strokeRect(markerX - 2, y - 2, 4, 4);

    this.tweens.add({ targets: marker, alpha: { from: 0.3, to: 1 }, duration: 1400, yoyo: true, repeat: -1 });
  }

  private buildPlayButton(width: number, height: number): void {
    new PixelButton(this, width / 2, height * 0.6, t('play'), {
      width: 96,
      height: 30,
      onClick: () => {
        const firstLevel = getAllLevels()[0];
        if (firstLevel) this.scene.start('GameplayScene', { levelId: firstLevel.id });
      },
    });

    new PixelButton(this, width / 2, height * 0.6 + 36, t('howToPlay'), {
      width: 140,
      height: 18,
      textScale: 1,
      onClick: () => this.scene.launch('HowToPlayScene'),
    });

    new PixelButton(this, width / 2, height * 0.6 + 58, t('settings'), {
      width: 140,
      height: 18,
      textScale: 1,
      onClick: () => this.scene.launch('SettingsScene'),
    });
  }
}
