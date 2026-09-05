import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { formatMmSs } from '@/utils/formatTime';
import { PixelLabel } from '@/ui/PixelLabel';
import { PixelButton } from '@/ui/PixelButton';
import { drawPanel, buildDimBackdrop } from '@/ui/Panel';
import { fadeIn } from '@/ui/SceneFade';
import { personalityTag } from '@/ai/SystemPersonality';
import { sectorNumberOf } from '@/gameplay/sectors';
import { AdsService } from '@/services/AdsService';
import { CurrencyService } from '@/services/CurrencyService';
import { EARN_AMOUNTS } from '@/data/shop/economy';

export interface SectorCompleteData {
  completedLevelId: string;
  deaths: number;
  timeMs: number;
  nextLevelId: string | undefined;
}

/**
 * The one natural meta-break in the campaign (master-prompt §14/§27): a
 * sector just ended, so this is where a version bump gets an actual
 * announced moment instead of quietly changing a HUD prefix a player has to
 * notice on their own. Full-screen `start`, not an overlay — the run this
 * sector represents is over, there's nothing paused underneath to return to.
 */
export class SectorCompleteScene extends Phaser.Scene {
  private sectorData!: SectorCompleteData;

  constructor() {
    super('SectorCompleteScene');
  }

  init(data: SectorCompleteData): void {
    this.sectorData = data;
  }

  create(): void {
    // The one natural ad breakpoint in the campaign (master-prompt "fair ad
    // system" §10) — a no-op today (no live SDK, no purchase to gate on
    // yet), but every future caller of AdsService only ever has to change
    // this file, not hunt for scattered ad calls.
    AdsService.requestInterstitial('SECTOR_COMPLETE');
    CurrencyService.earnCredits(EARN_AMOUNTS.sectorComplete, 'sector_complete');

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(PALETTE.bgVoid);
    fadeIn(this);
    buildDimBackdrop(this);

    const panelW = Math.min(260, width - 40);
    const panelH = 190;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;
    const g = this.add.graphics();
    drawPanel(g, panelX, panelY, panelW, panelH);

    const sector = sectorNumberOf(this.sectorData.completedLevelId);
    new PixelLabel(this, width / 2, panelY + 18, `${t('resultTitle')} ${sector}`, {
      color: hexToCss(PALETTE.white),
      strokeColor: hexToCss(PALETTE.outline),
      scale: 2,
    }).setOrigin(0.5, 0.5);

    const stats = [
      `${t('resultTime')}: ${formatMmSs(this.sectorData.timeMs)}`,
      `${t('resultDeaths')}: ${this.sectorData.deaths}`,
      `${t('resultCreditsEarned')}: ${EARN_AMOUNTS.sectorComplete} CREDITS`,
    ];
    let y = panelY + 44;
    for (const line of stats) {
      new PixelLabel(this, width / 2, y, line, {
        color: hexToCss(PALETTE.white),
        strokeColor: hexToCss(PALETTE.outline),
        scale: 1,
      }).setOrigin(0.5, 0);
      y += 16;
    }

    y += 6;
    const oldTag = personalityTag(this.sectorData.completedLevelId);
    const newTag = this.sectorData.nextLevelId ? personalityTag(this.sectorData.nextLevelId) : oldTag;
    if (newTag !== oldTag) {
      new PixelLabel(this, width / 2, y, t('resultSystemUpdate'), {
        color: hexToCss(PALETTE.system),
        strokeColor: hexToCss(PALETTE.outline),
        scale: 1,
      }).setOrigin(0.5, 0);
      y += 12;
      new PixelLabel(this, width / 2, y, `SYSTEM ${newTag}`, {
        color: hexToCss(PALETTE.system),
        strokeColor: hexToCss(PALETTE.outline),
        scale: 1,
      }).setOrigin(0.5, 0);
    } else if (!this.sectorData.nextLevelId) {
      new PixelLabel(this, width / 2, y, t('resultCampaignDone'), {
        color: hexToCss(PALETTE.system),
        strokeColor: hexToCss(PALETTE.outline),
        scale: 1,
        wordWrapWidth: panelW - 24,
      }).setOrigin(0.5, 0);
    }

    const shopWidth = 64;
    const gap = 8;
    const nextWidth = panelW - 24 - shopWidth - gap;
    const buttonY = panelY + panelH - 22;

    new PixelButton(this, width / 2 - nextWidth / 2 - gap / 2, buttonY, t('shop'), {
      width: shopWidth,
      height: 20,
      textScale: 1,
      // `launch` runs ShopScene alongside this one rather than pausing it —
      // its dim backdrop only paints over NEXT/SHOP, it doesn't stop this
      // scene's own input plugin from still hitting them underneath.
      onClick: () => {
        this.input.enabled = false;
        this.scene.launch('ShopScene');
        this.scene.get('ShopScene').events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
          this.input.enabled = true;
        });
      },
    });

    new PixelButton(this, width / 2 + shopWidth / 2 + gap / 2, buttonY, t('next'), {
      width: nextWidth,
      height: 20,
      textScale: 1,
      onClick: () => {
        if (this.sectorData.nextLevelId) {
          this.scene.start('GameplayScene', { levelId: this.sectorData.nextLevelId, entryTransition: true });
        } else {
          this.scene.start('MainMenuScene');
        }
      },
    });
  }
}
