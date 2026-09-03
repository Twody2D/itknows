import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';
import { hashRange, hash01, stringHash } from './hash';

export interface EnvironmentLayers {
  far: Phaser.GameObjects.Graphics;
  mid: Phaser.GameObjects.Graphics;
  signals: Phaser.GameObjects.Graphics;
}

interface Silhouette {
  x: number;
  w: number;
  h: number;
}

/**
 * Composed depth scene, not a tilemap of towers (art-direction reset,
 * gameplay-screen pass): far/mid silhouettes are placed with irregular
 * width/height/spacing driven by a per-level hash (`hash.ts`) instead of a
 * fixed step, so no two buildings repeat the same rhythm and the skyline
 * reads as asymmetric massing rather than a grid. One silhouette near the
 * front third is forced tall and narrow — a spire — and carries THE
 * SYSTEM's one visual anchor in the world (a small observing node with a
 * slow sweep), giving the composition a focal point instead of scattered
 * equal-weight shapes. Everything is drawn once into static `Graphics` (or
 * transform-only tweened afterward) — no per-frame redraw, CLAUDE.md #9.
 */
export function buildEnvironmentLayers(
  scene: Phaser.Scene,
  worldWidth: number,
  worldHeight: number,
  seedKey = 'default',
  /**
   * Force a dominant spire + THE SYSTEM's sensor node as the composition's
   * focal point. Off for scenes that already compose their own foreground
   * (the main menu has its own logo/character/SYSTEM line) — an
   * auto-placed spire doesn't know where that foreground sits and can
   * collide with it.
   */
  focalPoint = true,
): EnvironmentLayers {
  const far = scene.add.graphics().setDepth(-30);
  const mid = scene.add.graphics().setDepth(-20);
  const signals = scene.add.graphics().setDepth(-10);
  const seed = stringHash(seedKey);
  const towerBaseY = worldHeight;

  // A soft haze instead of flat black above the skyline — cheap, renderer-agnostic
  // (no fillGradientStyle: it's WebGL-only and this project must degrade to Canvas).
  const hazeTop = Math.max(0, towerBaseY - 230);
  const bandCount = 4;
  for (let i = 0; i < bandCount; i++) {
    const bandH = (towerBaseY - hazeTop) / bandCount;
    far.fillStyle(PALETTE.bgIndigo, 0.05 + i * 0.03);
    far.fillRect(-40, hazeTop + i * bandH, worldWidth + 80, bandH + 1);
  }

  // FAR — irregular massing: variable width/gap/height from a walking cursor,
  // not `col % step`. Two tone weights so shapes don't all read as equal mass.
  const farShapes: Silhouette[] = [];
  let cursor = -40;
  let i = 0;
  while (cursor < worldWidth + 40) {
    const s = seed + i * 104729;
    const w = hashRange(s, 16, 48);
    const h = hashRange(s + 1, 46, 120);
    farShapes.push({ x: cursor, w, h });
    cursor += w + hashRange(s + 2, 8, 40);
    i++;
  }

  // Force one dominant spire near the front third — the composition's focal point.
  let spireIndex = -1;
  let spire: Silhouette | undefined;
  if (focalPoint) {
    const spireTarget = worldWidth * (0.2 + hash01(seed + 99) * 0.12);
    let spireDist = Infinity;
    for (let k = 0; k < farShapes.length; k++) {
      const shape = farShapes[k];
      if (!shape) continue;
      const d = Math.abs(shape.x - spireTarget);
      if (d < spireDist) {
        spireDist = d;
        spireIndex = k;
      }
    }
    spire = farShapes[spireIndex];
    if (spire) {
      spire.w = hashRange(seed + 7, 10, 15);
      spire.h = hashRange(seed + 8, 175, 215);
    }
  }

  for (let k = 0; k < farShapes.length; k++) {
    const shape = farShapes[k];
    if (!shape) continue;
    const heavy = k === spireIndex || hash01(seed + k * 311) < 0.22;
    far.fillStyle(heavy ? PALETTE.layerNear : PALETTE.layerFar, 1);
    far.fillRect(shape.x, towerBaseY - shape.h, shape.w, shape.h);

    // Sparse lit windows — a handful of buildings, not every one.
    if (hash01(seed + k * 613) < 0.35 && shape.h > 60) {
      const wx = shape.x + hashRange(seed + k * 71, 2, Math.max(3, shape.w - 2));
      const wy = towerBaseY - hashRange(seed + k * 53, 8, shape.h - 6);
      signals.fillStyle(PALETTE.cyanDim, 0.5);
      signals.fillRect(wx, wy, 1, 1);
    }
  }

  // MID — fewer, larger industrial structures with occasional protruding pipes.
  cursor = -30;
  i = 0;
  const midShapes: Silhouette[] = [];
  while (cursor < worldWidth + 30) {
    const s = seed + 5000 + i * 92821;
    const w = hashRange(s, 20, 46);
    const h = hashRange(s + 1, 24, 70);
    midShapes.push({ x: cursor, w, h });
    cursor += w + hashRange(s + 2, 18, 60);
    i++;
  }
  mid.fillStyle(PALETTE.layerMid, 1);
  for (let k = 0; k < midShapes.length; k++) {
    const shape = midShapes[k];
    if (!shape) continue;
    mid.fillRect(shape.x, towerBaseY - shape.h, shape.w, shape.h);
    if (hash01(seed + 5000 + k * 271) < 0.4) {
      const pipeX = shape.x + shape.w * 0.5 - 1;
      const pipeH = hashRange(seed + k * 41, 8, 20);
      mid.fillRect(pipeX, towerBaseY - shape.h - pipeH, 2, pipeH);
    }
  }

  // A handful of sagging cables, not a full-width repeating comb.
  mid.lineStyle(1, PALETTE.layerMid, 1);
  for (let k = 0; k < 3; k++) {
    const s = seed + 9000 + k * 1777;
    const startX = hashRange(s, 0, worldWidth * 0.7);
    const spanW = hashRange(s + 1, 80, 220);
    const y = towerBaseY - hashRange(s + 2, 60, 160);
    const sag = hashRange(s + 3, 4, 12);
    mid.beginPath();
    mid.moveTo(startX, y);
    mid.lineTo(startX + spanW * 0.5, y + sag);
    mid.lineTo(startX + spanW, y);
    mid.strokePath();
  }

  far.setScrollFactor(0.15, 0.05);
  mid.setScrollFactor(0.4, 0.1);
  signals.setScrollFactor(0.4, 0.1);

  if (focalPoint && spire) {
    buildSystemNode(scene, spire.x + spire.w / 2, towerBaseY - spire.h, seed);
  }

  return { far, mid, signals };
}

/**
 * THE SYSTEM's one visual anchor in the world (art-direction reset §7): a
 * small aperture mounted on the skyline's spire, not a face or a robot —
 * a restrained lens with a slow sweeping glance. Built once; the sweep is a
 * transform-only tween (angle), never a per-frame redraw (CLAUDE.md #9).
 */
function buildSystemNode(scene: Phaser.Scene, x: number, y: number, seed: number): void {
  const node = scene.add.graphics().setDepth(-18).setScrollFactor(0.15, 0.05);
  node.lineStyle(1, PALETTE.system, 0.7);
  node.strokeCircle(x, y, 3);
  node.fillStyle(PALETTE.system, 0.9);
  node.fillRect(x - 1, y - 1, 2, 2);

  // Drawn in local space around (0,0) so the pivot set below is the triangle's apex.
  const beam = scene.add.graphics().setDepth(-19).setScrollFactor(0.15, 0.05);
  beam.fillStyle(PALETTE.systemDim, 0.35);
  beam.fillTriangle(0, 0, -4, 60, 4, 60);
  beam.setPosition(x, y);

  const sweep = 14 + hash01(seed + 321) * 10;
  scene.tweens.add({
    targets: beam,
    angle: { from: -sweep, to: sweep },
    duration: 4200 + hash01(seed + 654) * 1800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: node,
    alpha: { from: 0.55, to: 1 },
    duration: 1800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}
