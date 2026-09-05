import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { PixelLabel } from '@/ui/PixelLabel';
import { PixelButton } from '@/ui/PixelButton';
import { drawPanel, buildDimBackdrop } from '@/ui/Panel';
import { LEVELS_PER_SECTOR, SECTOR_COUNT, levelIdFor, sectorName } from '@/gameplay/sectors';
import { SaveService } from '@/services/SaveService';
import { DAILY_CHALLENGE_VARIANT_ID, getDailyChallenge } from '@/gameplay/DailyChallenge';

const PANEL_H = 218;

/**
 * The level list the main menu was missing entirely — "Play" only ever
 * started the campaign from level 1, with no way to see or jump to any
 * other level. One sector's 6 levels at a time (numbered buttons, not full
 * names — 6 short evocative names in a row read as clutter, and the level's
 * own name already shows once you're in it), with arrows to page between
 * the 5 sectors.
 *
 * No lock state: every level is always selectable rather than gating access
 * behind completion. Levels already cleared (per `SaveService`) get a small
 * cyan corner dot instead — a visible "you've done this one", not a wall.
 */
export class LevelSelectScene extends Phaser.Scene {
  private sector = 1;
  private rowItems: Array<{ destroy(): void }> = [];

  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
    const { width, height } = this.scale;

    buildDimBackdrop(this);

    const panelW = Math.min(320, width - 24);
    const panelH = PANEL_H;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;
    const g = this.add.graphics();
    drawPanel(g, panelX, panelY, panelW, panelH);

    new PixelLabel(this, width / 2, panelY + 16, t('levels'), {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 2,
    }).setOrigin(0.5, 0.5);

    const navY = panelY + 44;
    new PixelButton(this, panelX + 26, navY, '<', {
      width: 24,
      height: 24,
      onClick: () => this.changeSector(-1),
    });
    new PixelButton(this, panelX + panelW - 26, navY, '>', {
      width: 24,
      height: 24,
      onClick: () => this.changeSector(1),
    });

    this.renderSector(panelX, panelW, navY, panelY + 84);

    new PixelButton(this, width / 2, panelY + 132, t('dailyChallenge'), {
      width: panelW - 24,
      height: 22,
      textScale: 1,
      onClick: () => {
        const daily = getDailyChallenge();
        this.scene.stop('MainMenuScene');
        this.scene.stop();
        this.scene.start('GameplayScene', {
          levelId: daily.levelId,
          forceVariantId: DAILY_CHALLENGE_VARIANT_ID,
          entryTransition: true,
        });
      },
    });

    new PixelButton(this, width / 2, panelY + panelH - 20, t('back'), {
      width: panelW - 24,
      height: 20,
      textScale: 1,
      onClick: () => this.scene.stop(),
    });
  }

  private changeSector(delta: number): void {
    this.sector = Phaser.Math.Wrap(this.sector - 1 + delta, 0, SECTOR_COUNT) + 1;
    for (const item of this.rowItems) item.destroy();
    this.rowItems = [];
    const { width } = this.scale;
    const panelW = Math.min(320, width - 24);
    const panelX = width / 2 - panelW / 2;
    const panelY = this.scale.height / 2 - PANEL_H / 2;
    this.renderSector(panelX, panelW, panelY + 44, panelY + 84);
  }

  private renderSector(panelX: number, panelW: number, navY: number, gridY: number): void {
    const centerX = panelX + panelW / 2;

    const sectorLabel = new PixelLabel(
      this,
      centerX,
      navY,
      `${t('levelSelectSector')} ${String(this.sector).padStart(2, '0')}`,
      { color: hexToCss(PALETTE.cyan), strokeColor: hexToCss(PALETTE.outline), scale: 1 },
    ).setOrigin(0.5, 0.5);

    const subtitle = new PixelLabel(this, centerX, navY + 14, sectorName(this.sector), {
      color: hexToCss(PALETTE.system),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 1,
    }).setOrigin(0.5, 0.5);

    this.rowItems.push(sectorLabel, subtitle);

    const buttonSize = 38;
    const gap = 6;
    const totalWidth = LEVELS_PER_SECTOR * buttonSize + (LEVELS_PER_SECTOR - 1) * gap;
    const startX = centerX - totalWidth / 2 + buttonSize / 2;

    for (let i = 0; i < LEVELS_PER_SECTOR; i++) {
      const levelNumber = i + 1;
      const levelId = levelIdFor(this.sector, levelNumber);
      const button = new PixelButton(
        this,
        startX + i * (buttonSize + gap),
        gridY,
        String(levelNumber).padStart(2, '0'),
        {
          width: buttonSize,
          height: buttonSize,
          onClick: () => {
            this.scene.stop('MainMenuScene');
            this.scene.stop();
            this.scene.start('GameplayScene', { levelId, entryTransition: true });
          },
        },
      );
      this.rowItems.push(button);

      if (SaveService.isCompleted(levelId)) {
        const dot = this.add.rectangle(
          startX + i * (buttonSize + gap) + buttonSize / 2 - 5,
          gridY - buttonSize / 2 + 5,
          3,
          3,
          PALETTE.cyan,
          1,
        );
        this.rowItems.push(dot);
      }
    }
  }
}
