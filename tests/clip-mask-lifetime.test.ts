import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Source with comments stripped — this file discusses masks at length in prose, and only the calls matter. */
const read = (rel: string): string =>
  readFileSync(resolve(__dirname, '..', rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/**
 * A Phaser geometry mask reaches through to the `Graphics` that defines it
 * on every frame every masked object renders. Destroy that Graphics while
 * anything still wears the mask and nothing fails at the destroy — the next
 * frame throws inside the renderer instead ("Cannot read properties of null
 * (reading 'renderWebGL')"), and the exception aborts the frame.
 *
 * In the shop that read as the game breaking outright: the death preview's
 * flashes and glitch slices live 140-260ms on a tween, a fast tab switch
 * destroyed the mask under them, the canvas froze on its last good frame,
 * and the DOM text layer carried on drawing the new tab over the top of the
 * frozen picture — "одна вкладка зависает и ломается вся игра... текст и
 * картинки будут зависать друг на друге" (owner). Reproduced with 200
 * rail clicks; one TypeError before the fix, none after.
 *
 * So every masked object is registered when it gets the mask and released
 * when the mask is cleared. These tests guard that one invariant, because
 * the failure it prevents surfaces nowhere near its cause.
 */
describe('nothing outlives the geometry mask it wears', () => {
  const fx = read('src/fx/FxManager.ts');

  it('routes every short-lived masked object through applyClip', () => {
    expect(fx).toContain('private applyClip(');
    // A bare `setMask(this.clipMask)` outside `applyClip` is the shape of
    // the original bug: it masks the object and forgets it. The one call
    // inside `applyClip` is the registration point, so it is cut out first.
    const start = fx.indexOf('private applyClip(');
    const body = fx.slice(start, fx.indexOf('\n  }', start));
    const elsewhere = (fx.slice(0, start) + fx.slice(start + body.length)).match(/\.setMask\(this\.clipMask\)/g) ?? [];
    expect(elsewhere).toHaveLength(0);
  });

  it('un-masks everything it is holding when the mask is cleared', () => {
    const setClip = fx.slice(fx.indexOf('setClipMask('));
    expect(setClip).toContain('this.masked');
    expect(setClip).toContain('clearMask()');
  });

  it('stops tracking an object once it destroys itself', () => {
    // Otherwise the set is a leak that grows for the whole session.
    expect(fx).toContain('Phaser.GameObjects.Events.DESTROY');
    expect(fx).toContain('this.masked.delete');
  });

  it('clears the mask when the manager itself is torn down', () => {
    const destroyBody = fx.slice(fx.lastIndexOf('destroy(): void'));
    expect(destroyBody).toContain('setClipMask(null)');
  });

  it('has the shop hand the mask back before destroying the graphics behind it', () => {
    // Order matters and is easy to reverse in an edit: clear first, then
    // destroy. Reversed, this is the bug again.
    const shop = read('src/scenes/ShopScene.ts');
    const disposal = shop.slice(shop.indexOf('setClipMask(null)'), shop.indexOf('setClipMask(null)') + 200);
    const clearAt = disposal.indexOf('setClipMask(null)');
    const destroyAt = disposal.indexOf('mask.destroy()');
    expect(clearAt).toBeGreaterThanOrEqual(0);
    expect(destroyAt).toBeGreaterThan(clearAt);
  });
});
