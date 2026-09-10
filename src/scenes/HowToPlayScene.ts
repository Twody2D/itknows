import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hexToCss } from '@/utils/color';
import { t } from '@/i18n/ui';
import { DomTextOverlay } from '@/ui/DomTextOverlay';
import { buildScreenTopbar, attachEscape, SCREEN_TOPBAR_H } from '@/ui/ScreenChrome';
import { buildRadialGridBackdrop } from '@/art/ProceduralBackdrop';
import { fadeIn } from '@/ui/SceneFade';
import { buildKeyRow } from '@/ui/KeyCap';
import { jumpHintKeys, moveHintKeys } from '@/ui/TutorialHints';
import { InventoryService } from '@/services/InventoryService';
import { playerTexturePrefix } from '@/data/shop/skinVisuals';

/**
 * «Как играть», rebuilt against Claude Design mockup 4f: five numbered cards
 * that each *show* the rule before naming it, instead of five lines of prose.
 * Every picture is drawn from the same primitives and the same palette the
 * levels use, and the control cards draw the real bindings through
 * `buildKeyRow`/`TutorialHints` — so a phone player sees thumb buttons and a
 * desktop player sees every key that works, exactly as Level 01's own hints
 * do. Static overlay: launched from the main menu, always ends itself with
 * `scene.stop()`.
 */
export class HowToPlayScene extends Phaser.Scene {
  private domText!: DomTextOverlay;

  constructor() {
    super('HowToPlayScene');
  }

  create(): void {
    const { width, height } = this.scale;

    buildRadialGridBackdrop(this, width, height, 'howto-backdrop', 0.55, 0.3);
    fadeIn(this);

    this.domText = new DomTextOverlay(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.domText.destroy());

    buildScreenTopbar(this, this.domText, {
      title: t('howToPlayTitle'),
      subtitle: t('htpSubtitle'),
      accent: PALETTE.cyan,
      onBack: () => this.scene.stop(),
    });
    attachEscape(this, () => this.scene.stop());

    const gutter = 12;
    const w = Math.min(width - gutter * 2, 596);
    const gap = 8;

    const topY = SCREEN_TOPBAR_H + 10;
    const topH = 104;
    const colW = Math.floor((w - gap * 2) / 3);

    this.buildMoveCard(gutter, topY, colW, topH);
    this.buildJumpCard(gutter + colW + gap, topY, colW, topH);
    this.buildChipCard(gutter + (colW + gap) * 2, topY, w - (colW + gap) * 2, topH);

    const lowY = topY + topH + 8;
    const lowH = height - lowY - 12;
    const halfW = Math.floor((w - gap) / 2);
    this.buildTrapCard(gutter, lowY, halfW, lowH);
    this.buildDeathCard(gutter + halfW + gap, lowY, w - halfW - gap, lowH);
  }

  // ---- shared card shell -------------------------------------------------

  /** Frame + numbered header band. Returns the inner top edge the art starts at. */
  private buildCard(x: number, y: number, w: number, h: number, index: number, title: string, accent: number, band: number): number {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.metalDark, 1);
    g.fillRect(x, y, w, h);
    g.fillStyle(band, 0.5);
    g.fillRect(x, y, w, 20);
    g.lineStyle(1, accent, 0.7);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    this.domText.add(
      x + 7,
      y + 10,
      String(index),
      { color: hexToCss(accent), strokeColor: hexToCss(PALETTE.outline), sizePx: 11, bold: true },
      0,
      0.5,
    );
    this.domText.add(
      x + 18,
      y + 10,
      title,
      { color: hexToCss(PALETTE.white), strokeColor: hexToCss(PALETTE.outline), sizePx: 11, bold: true },
      0,
      0.5,
    );
    return y + 20;
  }

  /** The player as the level really draws it — the same texture the shop's fitting room and the gameplay scene use. */
  private addPlayer(x: number, groundY: number, scale: number): void {
    const prefix = playerTexturePrefix(InventoryService.getEquipped('character'));
    if (!this.textures.exists(`${prefix}-idle-0`)) return;
    this.add.sprite(x, groundY, `${prefix}-idle-0`).setOrigin(0.5, 1).setScale(scale);
  }

  private note(x: number, y: number, w: number, text: string, lines: number): void {
    this.domText.add(
      x,
      y,
      text,
      {
        color: hexToCss(PALETTE.textMuted),
        strokeColor: hexToCss(PALETTE.outline),
        sizePx: 9,
        wordWrapWidth: w,
        clampLines: lines,
      },
      0,
      0,
    );
  }

  // ---- 1 · walk ----------------------------------------------------------

  private buildMoveCard(x: number, y: number, w: number, h: number): void {
    const top = this.buildCard(x, y, w, h, 1, t('htpStepMove'), PALETTE.cyan, PALETTE.cyanDim);
    const artH = 48;
    const groundY = top + artH;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgVoid, 1);
    g.fillRect(x + 1, top, w - 2, artH);
    g.fillStyle(PALETTE.cyanDim, 1);
    g.fillRect(x + 1, groundY - 4, w - 2, 4);

    // Motion reads as a trail behind and an arrow ahead — the same shorthand
    // the DATA TRAIL cosmetic uses in play.
    g.fillStyle(PALETTE.cyanDim, 1);
    g.fillRect(x + 16, groundY - 22, 4, 2);
    g.fillStyle(PALETTE.cyan, 0.6);
    g.fillRect(x + 26, groundY - 22, 8, 2);
    g.fillStyle(PALETTE.cyan, 1);
    g.fillTriangle(x + w - 26, groundY - 28, x + w - 26, groundY - 16, x + w - 14, groundY - 22);

    this.addPlayer(x + w / 2, groundY - 4, 0.8);

    buildKeyRow(this, x + w / 2, top + artH + (h - 20 - artH) / 2, moveHintKeys());
  }

  // ---- 2 · jump ----------------------------------------------------------

  private buildJumpCard(x: number, y: number, w: number, h: number): void {
    const top = this.buildCard(x, y, w, h, 2, t('htpStepJump'), PALETTE.cyan, PALETTE.cyanDim);
    const artH = 48;
    const bottom = top + artH;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgVoid, 1);
    g.fillRect(x + 1, top, w - 2, artH);

    const ledgeW = Math.round((w - 2) * 0.3);
    g.fillStyle(PALETTE.cyanDim, 1);
    g.fillRect(x + 1, bottom - 16, ledgeW, 4);
    g.fillRect(x + w - 1 - ledgeW, bottom - 16, ledgeW, 4);

    // The gap between the ledges is the hazard, drawn the way a level draws
    // one: a dark pit with red teeth, never an empty space.
    const pitX = x + 1 + ledgeW;
    const pitW = w - 2 - ledgeW * 2;
    g.fillStyle(PALETTE.metalMid, 1);
    g.fillRect(pitX, bottom - 10, pitW, 10);
    const teeth = Math.max(1, Math.floor(pitW / 8));
    const toothW = pitW / teeth;
    for (let i = 0; i < teeth; i++) {
      const tx = pitX + i * toothW;
      g.fillStyle(PALETTE.danger, 1);
      g.fillTriangle(tx, bottom - 10, tx + toothW, bottom - 10, tx + toothW / 2, bottom - 17);
    }

    this.addPlayer(x + w / 2, bottom - 24, 0.8);

    buildKeyRow(this, x + w / 2, bottom + (h - 20 - artH) / 2, jumpHintKeys());
  }

  // ---- 3 · chips ---------------------------------------------------------

  private buildChipCard(x: number, y: number, w: number, h: number): void {
    const top = this.buildCard(x, y, w, h, 3, t('htpStepChips'), PALETTE.reward, PALETTE.goldDim);
    const artH = 48;
    const groundY = top + artH;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgVoid, 1);
    g.fillRect(x + 1, top, w - 2, artH);
    g.fillStyle(PALETTE.goldDim, 1);
    g.fillRect(x + 1, groundY - 4, w - 2, 4);

    [0.18, 0.5, 0.82].forEach((at, i) => {
      g.fillStyle(PALETTE.reward, 1);
      g.fillRect(Math.round(x + w * at) - 5, top + 8 + (i % 2) * 6, 10, 10);
      g.fillStyle(PALETTE.goldEdge, 1);
      g.fillRect(Math.round(x + w * at) - 2, top + 11 + (i % 2) * 6, 4, 4);
    });

    this.addPlayer(x + w * 0.3, groundY - 4, 0.7);

    this.note(x + 8, groundY + 8, w - 16, t('htpChipsNote'), 2);
  }

  // ---- 4 · a trap warns first -------------------------------------------

  private buildTrapCard(x: number, y: number, w: number, h: number): void {
    const top = this.buildCard(x, y, w, h, 4, t('htpStepTrap'), PALETTE.dangerAlt, PALETTE.goldDim);
    const frameH = Math.max(34, h - 20 - 24);
    const frameW = Math.floor((w - 16 - 14) / 2);

    // Two frames of the same moment: the ≥250ms telegraph, then the strike
    // (CLAUDE.md #4.2). Showing them side by side is the whole rule.
    const drawFrame = (fx: number, index: number, armed: boolean): void => {
      const g = this.add.graphics();
      g.fillStyle(PALETTE.bgVoid, 1);
      g.fillRect(fx, top + 6, frameW, frameH);
      g.lineStyle(1, armed ? PALETTE.dangerAlt : PALETTE.metalMid, 1);
      g.strokeRect(fx + 0.5, top + 6.5, frameW - 1, frameH - 1);
      g.fillStyle(PALETTE.cyanDim, 1);
      g.fillRect(fx + 1, top + frameH, frameW - 2, 4);

      if (armed) {
        g.fillStyle(PALETTE.danger, 1);
        g.fillRect(fx + 10, top + 12, frameW - 34, 13);
      } else {
        g.fillStyle(PALETTE.dangerAlt, 0.85);
        g.fillRect(fx + 10, top + 14, frameW - 34, 7);
      }

      this.addPlayer(armed ? fx + frameW - 12 : fx + frameW / 2, top + frameH, 0.55);

      this.domText.add(
        fx + 4,
        top + 12,
        String(index),
        { color: hexToCss(PALETTE.goldEdge), strokeColor: hexToCss(PALETTE.outline), sizePx: 8, bold: true },
        0,
        0.5,
      );
    };

    drawFrame(x + 8, 1, false);
    drawFrame(x + 8 + frameW + 14, 2, true);

    const arrow = this.add.graphics();
    arrow.fillStyle(PALETTE.goldEdge, 1);
    arrow.fillTriangle(x + 12 + frameW, top + frameH / 2, x + 12 + frameW, top + frameH / 2 + 12, x + 20 + frameW, top + frameH / 2 + 6);

    this.note(x + 8, top + frameH + 12, w - 16, t('htpTrapNote'), 1);
  }

  // ---- 5 · dying is fine -------------------------------------------------

  private buildDeathCard(x: number, y: number, w: number, h: number): void {
    const top = this.buildCard(x, y, w, h, 5, t('htpStepDeath'), PALETTE.system, PALETTE.systemDim);
    const box = Math.min(44, h - 30);

    const g = this.add.graphics();
    g.fillStyle(PALETTE.bgVoid, 1);
    g.fillRect(x + 8, top + 8, box, box);
    g.lineStyle(1, PALETTE.metalMid, 1);
    g.strokeRect(x + 8.5, top + 8.5, box - 1, box - 1);

    // The fragments the real `FxManager.deathBurst` throws, in its own colors.
    const bits: [number, number, number, number][] = [
      [8, 8, 6, PALETTE.dangerAlt],
      [24, 14, 5, PALETTE.reward],
      [14, 26, 5, PALETTE.dangerAlt],
      [28, 30, 4, PALETTE.goldEdge],
    ];
    for (const [dx, dy, size, color] of bits) {
      if (dx + size > box || dy + size > box) continue;
      g.fillStyle(color, 1);
      g.fillRect(x + 8 + dx, top + 8 + dy, size, size);
    }

    this.note(x + 8 + box + 10, top + 12, w - box - 28, t('htpDeathNote'), 4);
  }
}
