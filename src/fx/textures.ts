import Phaser from 'phaser';

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * Tiny white base textures for particle FX — recolored per-emitter via
 * Phaser's `tint` config instead of baking a texture per color (CLAUDE.md #3:
 * procedural, zero binary assets, minimal texture count).
 */
export function generateFxTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('fx-dot')) return;

  const dot = makeCanvas(2, 2);
  dot.ctx.fillStyle = '#ffffff';
  dot.ctx.fillRect(0, 0, 2, 2);
  scene.textures.addCanvas('fx-dot', dot.canvas);

  const spark = makeCanvas(3, 3);
  spark.ctx.fillStyle = '#ffffff';
  spark.ctx.fillRect(1, 0, 1, 3);
  spark.ctx.fillRect(0, 1, 3, 1);
  scene.textures.addCanvas('fx-spark', spark.canvas);
}
