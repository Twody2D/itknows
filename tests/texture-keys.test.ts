import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

/** Everything `SpriteFactory` actually puts into the texture manager. */
function registeredKeys(): Set<string> {
  const src = readFileSync(resolve(SRC, 'art', 'SpriteFactory.ts'), 'utf8');
  const keys = new Set<string>();
  for (const m of src.matchAll(/addOrReplaceCanvas\(\s*scene\s*,\s*[`'"]([^`'"$]+)[`'"]/g)) keys.add(m[1] as string);
  // Generated per skin/animation rather than by a literal call above.
  for (const m of src.matchAll(/addOrReplaceCanvas\(\s*scene\s*,\s*`([^`]*)\$\{/g)) keys.add(`${m[1] as string}*`);
  return keys;
}

/**
 * A texture key that nothing generates renders as Phaser's green
 * missing-texture box, and nothing in the type system or the build says a
 * word about it — the game just looks broken in one place, on one level,
 * for whoever gets there.
 *
 * That happened: `'tile-ground'` was an alias registered beside
 * `'tile-ground-top'`, three traps keyed off it, and removing the seam
 * variants took the alias out with them. Typecheck, lint, 873 tests, the
 * build and a 30-level smoke sweep were all green, and CRUMBLE's crumbling
 * ledges were green boxes.
 */
describe('every texture key used in gameplay code is one SpriteFactory generates', () => {
  const registered = registeredKeys();
  const prefixes = [...registered].filter((k) => k.endsWith('*')).map((k) => k.slice(0, -1));
  const used = new Map<string, string>();

  for (const file of sourceFiles(SRC)) {
    if (file.endsWith(`SpriteFactory.ts`)) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/['"`](tile-[a-z0-9-]+|exit-(?:active|inactive)|trap-[a-z0-9-]+)['"`]/g)) {
      used.set(m[1] as string, file.slice(SRC.length + 1));
    }
  }

  it('finds texture keys to check at all', () => {
    expect(used.size).toBeGreaterThan(5);
    expect(registered.size).toBeGreaterThan(5);
  });

  it.each([...used.entries()])('%s (used in %s) is generated', (key, file) => {
    const ok = registered.has(key) || prefixes.some((p) => key.startsWith(p));
    expect(ok, `${key} is used in ${file} but SpriteFactory never registers it`).toBe(true);
  });

  it('generates both sides of the pit lip, which Level.ts builds by template', () => {
    expect(registered.has('tile-ground-edge-left')).toBe(true);
    expect(registered.has('tile-ground-edge-right')).toBe(true);
  });
});
