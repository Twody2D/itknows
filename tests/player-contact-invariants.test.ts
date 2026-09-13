import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Source with comments stripped — these files discuss `physics.add.overlap` at length in prose, and it is only the calls that matter. */
const read = (rel: string): string =>
  readFileSync(resolve(__dirname, '..', rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/**
 * A guard on one Arcade Physics behaviour that is invisible in a code review
 * and produced a game-breaking bug twice removed from its cause.
 *
 * `SeparateY` flags `touching.down` on the player for ANY resolved vertical
 * intersection — an overlap-only one included, where it sets the flag and
 * then declines to separate the bodies. `Player.preUpdate` reads that flag
 * as "there is ground under my feet", so any detector registered through
 * `physics.add.overlap(player, ...)` becomes a surface: coyote time keeps
 * refreshing inside it and a buffered jump fires again every frame.
 *
 * That is what a trigger band in front of a pit turned into once the band
 * grew to five tiles (`APPROACH_BAND_TILES`) — a staircase a tapping player
 * could climb straight up through the air ("можно буквально летать и
 * прыгать от воздуха... будто от триггера отталкиваюсь"). Nothing in the
 * types or the tests said so; the only signal was the game.
 *
 * So detectors are plain rectangles swept by hand in `GameplayScene`
 * (`sweepZoneContacts`), and this test exists to keep the next convenient
 * `physics.add.overlap` from quietly reintroducing the trampoline.
 */
describe('player contact detectors are never physics overlaps', () => {
  it('GameplayScene registers no physics overlap at all', () => {
    expect(read('src/scenes/GameplayScene.ts')).not.toContain('physics.add.overlap');
  });

  it('a trigger switch owns no physics body', () => {
    const src = read('src/traps/TriggerTrap.ts');
    expect(src).not.toContain('physics.add');
    expect(src).toContain('Phaser.Geom.Rectangle');
  });

  it('a decoy door owns no physics body', () => {
    const src = read('src/traps/FakeExit.ts');
    expect(src).not.toContain('physics.add');
    expect(src).toContain('Phaser.Geom.Rectangle');
  });

  it('the real exit is a rectangle, not a zone with a body', () => {
    const src = read('src/gameplay/Level.ts');
    expect(src).not.toMatch(/physics\.add\.existing\(\s*exitZone/);
    expect(src).toContain('const exitZone = new Phaser.Geom.Rectangle(');
  });
});
