import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '..', 'src');

/** Source with comments stripped — several of these files discuss the subscription in prose, and only the calls matter. */
function read(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith('.ts')) out.push(path);
  }
  return out;
}

/**
 * `scene.scale` is the GAME's ScaleManager, shared by every scene and alive
 * for the whole session — subscribing to it from something a scene owns and
 * not unsubscribing leaves a handler holding objects that no longer exist.
 *
 * This is not hypothetical. `TouchControls` subscribed to `resize` in its
 * constructor and never took it back, so every death (a scene restart) left
 * another live handler behind, each one still holding the previous run's
 * zones. The next viewport change ran `layout()` on all of them and threw
 * out of `refreshHitArea` — four resizes after a few deaths, four
 * TypeErrors, measured in a real browser. A phone changes its viewport
 * constantly: the address bar sliding away, a rotation, the keyboard
 * opening. `src/ui/relayout.ts` had always done this correctly; nothing
 * made the other one match until it broke.
 */
describe('nothing subscribes to the game-wide ScaleManager without unsubscribing', () => {
  const files = walk(SRC).filter((path) => read(path).includes('scale.on('));

  it('finds the files that subscribe at all (so an empty pass cannot look green)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const path of files) {
    const rel = path.slice(SRC.length + 1).replace(/\\/g, '/');
    it(`${rel} takes its resize subscription back`, () => {
      const src = read(path);
      const subscriptions = src.match(/scale\.on\(/g)?.length ?? 0;
      const removals = src.match(/scale\.off\(/g)?.length ?? 0;
      expect(removals).toBeGreaterThanOrEqual(subscriptions);
    });

    it(`${rel} passes a named handler, not an inline arrow (an arrow cannot be removed)`, () => {
      const src = read(path);
      expect(src).not.toMatch(/scale\.on\(\s*[^,]+,\s*\(\)\s*=>/);
    });
  }
});

describe('TouchControls releases everything it took', () => {
  const src = read(resolve(SRC, 'ui/components/TouchControls.ts'));
  const destroyBody = src.slice(src.indexOf('destroy()'));

  it('unsubscribes from every scene input event it listened to', () => {
    for (const event of ['pointermove', 'pointerup', 'pointerupoutside']) {
      expect(destroyBody).toContain(`input.off('${event}'`);
    }
  });

  it('unsubscribes from resize', () => {
    expect(destroyBody).toContain("scale.off('resize'");
  });

  it('releases every held direction, so a finger down at teardown cannot stick', () => {
    // The shared InputState outlives the scene: whatever is still held when
    // the scene tears down would otherwise be held forever.
    expect(destroyBody).toContain('setTouchLeft(false)');
    expect(destroyBody).toContain('setTouchRight(false)');
    expect(destroyBody).toContain('setTouchJump(false)');
  });
});
