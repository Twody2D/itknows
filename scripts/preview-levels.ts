/**
 * ASCII preview of every campaign level, printed to the terminal.
 *
 * A one-screen level is small enough to read as text, and reading it is the
 * only way to catch the mistakes `LevelValidator` cannot: a jump that is
 * technically possible but lands on a spike, a patrol that sweeps the only
 * standing room, an exit the player reaches before the level has asked them
 * anything. Run it with `pnpm levels`.
 *
 * Dev tooling — never imported by the game.
 */
import { LEVEL_HEIGHT_TILES, exitRowOf } from '../src/gameplay/LevelDef';
import type { LevelDef } from '../src/gameplay/LevelDef';
import { validateLevel } from '../src/gameplay/LevelValidator';
import { parBreakdown } from '../src/gameplay/parTime';
import { SECTOR_01_LEVELS } from '../src/data/levels/sector01';
import { SECTOR_02_LEVELS } from '../src/data/levels/sector02';
import { SECTOR_03_LEVELS } from '../src/data/levels/sector03';
import { SECTOR_04_LEVELS } from '../src/data/levels/sector04';
import { SECTOR_05_LEVELS } from '../src/data/levels/sector05';
import { SECTOR_06_LEVELS } from '../src/data/levels/sector06';

const LEGEND = [
  '#  ground/platform      ^  static spike        P  spawn        E  exit',
  'x  spike trap (moving/bank/wall/orbit/swing/loop)             o  pursuer',
  '=  platform-family trap (moving/falling/disappearing/fake)    |  laser/gate',
  '~  electric floor       t  trigger              F  fake exit',
  'L  launch pad (solid, throws upward)',
].join('\n');

function blank(def: LevelDef): string[][] {
  return Array.from({ length: LEVEL_HEIGHT_TILES }, () => Array.from({ length: def.width }, () => ' '));
}

function isInAnyGap(col: number, gaps: Array<[number, number]>): boolean {
  return gaps.some(([from, to]) => col >= from && col <= to);
}

function put(grid: string[][], col: number, row: number, ch: string): void {
  if (row < 0 || row >= grid.length) return;
  const line = grid[row];
  if (!line || col < 0 || col >= line.length) return;
  line[col] = ch;
}

function paintTraps(grid: string[][], def: LevelDef): void {
  for (const trap of def.traps ?? []) {
    switch (trap.type) {
      case 'moving-spike':
        put(grid, trap.fromCol, trap.fromRow, 'x');
        put(grid, trap.toCol, trap.toRow, 'x');
        break;
      case 'laser':
      case 'timing-gate':
        for (let row = trap.topRow; row <= trap.bottomRow; row++) put(grid, trap.col, row, '|');
        break;
      case 'fake-platform':
      case 'disappearing-platform':
      case 'falling-platform':
        for (let i = 0; i < trap.width; i++) put(grid, trap.col + i, trap.row, '=');
        break;
      case 'moving-platform':
        for (let i = 0; i < trap.width; i++) {
          put(grid, trap.fromCol + i, trap.fromRow, '=');
          put(grid, trap.toCol + i, trap.toRow, '=');
        }
        break;
      case 'launch-pad':
        for (let i = 0; i < trap.width; i++) put(grid, trap.col + i, trap.row, 'L');
        break;
      case 'electric-floor':
        for (let i = 0; i < trap.width; i++) put(grid, trap.col + i, trap.row, '~');
        break;
      case 'trigger':
        for (let i = 0; i < trap.width; i++) put(grid, trap.col + i, trap.row + trap.height - 1, 't');
        break;
      case 'pursuer':
        put(grid, trap.col, trap.row, 'o');
        break;
      case 'fake-exit':
        put(grid, trap.col, trap.row, 'F');
        break;
      case 'spike-bank':
        for (let i = 0; i < trap.width; i++) {
          put(grid, trap.col + i, trap.hiddenRow, 'x');
          put(grid, trap.col + i, trap.lethalRow, 'x');
        }
        break;
      case 'spike-wall':
        for (let row = trap.topRow; row <= trap.bottomRow; row++) {
          for (let i = 0; i < trap.extendTiles; i++) {
            put(grid, trap.fromRight === true ? trap.col - i : trap.col + i, row, 'x');
          }
        }
        break;
      case 'orbit-spike':
        put(grid, trap.pivotCol, trap.pivotRow - trap.radiusTiles, 'x');
        put(grid, trap.pivotCol, trap.pivotRow + trap.radiusTiles, 'x');
        put(grid, trap.pivotCol - trap.radiusTiles, trap.pivotRow, 'x');
        put(grid, trap.pivotCol + trap.radiusTiles, trap.pivotRow, 'x');
        break;
      case 'swinging-spike':
        put(grid, trap.pivotCol, trap.pivotRow + trap.lengthTiles, 'x');
        break;
      case 'loop-spike':
        for (const point of trap.waypoints) put(grid, point.col, point.row, 'x');
        break;
    }
  }
}

function render(def: LevelDef): string {
  const grid = blank(def);

  for (let row = def.groundRow; row < LEVEL_HEIGHT_TILES; row++) {
    for (let col = 0; col < def.width; col++) {
      if (!isInAnyGap(col, def.gaps)) put(grid, col, row, '#');
    }
  }
  for (const platform of def.platforms) {
    for (let i = 0; i < platform.width; i++) put(grid, platform.col + i, platform.row, '#');
  }
  for (const col of def.spikeColumns) put(grid, col, def.groundRow - 1, '^');

  paintTraps(grid, def);

  put(grid, def.playerStartCol, def.groundRow - 1, 'P');
  const exitRow = exitRowOf(def);
  put(grid, def.exitCol, exitRow - 1, 'E');
  put(grid, def.exitCol + 1, exitRow - 1, 'E');

  const ruler = Array.from({ length: def.width }, (_, col) => (col % 10 === 0 ? String((col / 10) % 10) : ' ')).join('');
  const body = grid.map((line, row) => `${String(row).padStart(2, ' ')}|${line.join('')}|`).join('\n');
  return `${body}\n  |${ruler}|`;
}

const ALL = [
  ['01', SECTOR_01_LEVELS],
  ['02', SECTOR_02_LEVELS],
  ['03', SECTOR_03_LEVELS],
  ['04', SECTOR_04_LEVELS],
  ['05', SECTOR_05_LEVELS],
  ['06', SECTOR_06_LEVELS],
] as const;

const unsolvable: string[] = [];

console.log(LEGEND);
for (const [, levels] of ALL) {
  for (const level of levels) {
    const result = validateLevel(level);
    if (!result.valid) unsolvable.push(level.id);
    const verdict = result.valid ? 'solvable' : `UNSOLVABLE — ${result.reason ?? ''}`;
    // The third star's target time, printed beside the verdict because both
    // answer the same question about a level that was just edited: is it
    // still passable, and what does it now ask for. Derived unless the level
    // sets `starTimeMs` — `docs/level-editing.md` §4.1.
    const breakdown = parBreakdown(level);
    const star =
      breakdown === null
        ? ''
        : ` · ★★★ ${((level.starTimeMs ?? breakdown.parMs) / 1000).toFixed(1)}s` +
          `${level.starTimeMs === undefined ? '' : ' (вручную)'} · пол ${(breakdown.floorMs / 1000).toFixed(1)}s`;
    console.log(`\n=== ${level.id} · ${level.name} · ${verdict}${star}`);
    console.log(render(level));
  }
}

if (unsolvable.length > 0) {
  throw new Error(`unsolvable by the reachability solver: ${unsolvable.join(', ')}`);
}
