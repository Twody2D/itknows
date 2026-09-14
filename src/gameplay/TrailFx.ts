import Phaser from 'phaser';
import { FxQuality } from '@/fx/FxSettings';
import { PALETTE } from '@/config/palette';
import { lerpColor } from '@/utils/color';
import { PLAYER_SPRITE_H } from '@/art/PLAYER_SPRITE';

export type TrailKind = 'data_trail' | 'launch' | 'interference' | 'beep7';

/** Everything `TrailFx.update` needs from the player each frame — kept as plain data instead of a `Player` import so this stays testable/renderable without a physics body. */
export interface TrailPlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  flipX: boolean;
}

/** One pooled square/streak particle — every trail kind reuses this same shape via a different config, rather than three bespoke update loops. */
interface Particle {
  active: boolean;
  rect: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravityY: number;
  ageMs: number;
  lifeMs: number;
  colorFrom: number;
  colorTo: number;
  sizeAt: (frac: number) => { w: number; h: number };
  alphaAt: (frac: number) => number;
}

function makePool(scene: Phaser.Scene, count: number, blendAdd: boolean): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const rect = scene.add.rectangle(0, 0, 2, 2, PALETTE.white, 1).setVisible(false).setOrigin(0.5, 0.5);
    if (blendAdd) rect.setBlendMode(Phaser.BlendModes.ADD);
    pool.push({
      active: false,
      rect,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      gravityY: 0,
      ageMs: 0,
      lifeMs: 1,
      colorFrom: PALETTE.white,
      colorTo: PALETTE.white,
      sizeAt: () => ({ w: 2, h: 2 }),
      alphaAt: () => 1,
    });
  }
  return pool;
}

function spawn(pool: Particle[], init: Omit<Particle, 'active' | 'rect' | 'ageMs'>): void {
  const slot = pool.find((p) => !p.active);
  if (!slot) return;
  slot.active = true;
  slot.ageMs = 0;
  slot.x = init.x;
  slot.y = init.y;
  slot.vx = init.vx;
  slot.vy = init.vy;
  slot.gravityY = init.gravityY;
  slot.lifeMs = init.lifeMs;
  slot.colorFrom = init.colorFrom;
  slot.colorTo = init.colorTo;
  slot.sizeAt = init.sizeAt;
  slot.alphaAt = init.alphaAt;
  slot.rect.setVisible(true);
}

function stepPool(pool: Particle[], deltaMs: number): void {
  const dt = deltaMs / 1000;
  for (const p of pool) {
    if (!p.active) continue;
    p.ageMs += deltaMs;
    if (p.ageMs >= p.lifeMs) {
      p.active = false;
      p.rect.setVisible(false);
      continue;
    }
    p.vy += p.gravityY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const frac = p.ageMs / p.lifeMs;
    const { w, h } = p.sizeAt(frac);
    p.rect.setPosition(Math.round(p.x), Math.round(p.y));
    p.rect.setSize(w, h);
    p.rect.setFillStyle(lerpColor(p.colorFrom, p.colorTo, frac));
    p.rect.setAlpha(p.alphaAt(frac));
  }
}

function destroyPool(pool: Particle[]): void {
  for (const p of pool) p.rect.destroy();
}

const DATA_TRAIL_INTERVAL_MS = 80;
const INTERFERENCE_INTERVAL_MS = 45;
const DROP_EVERY_FRAMES = 60;
const DRONE_LERP = 0.12;
const DRONE_BOB_PERIOD_MS = 1400;
const DRONE_DIM_MS = 500;

/**
 * Cosmetic movement trails (master-prompt-adjacent shop content, design
 * round 2, 2026-09-06) — purely visual: no
 * physics body, drives no gameplay state, never gates a death or a jump.
 * Which trail (if any) is active is resolved once at construction from the
 * equipped inventory slot, same "only between attempts" rule every other
 * cosmetic already follows.
 *
 * Particles are small fixed pools of plain `Rectangle` game objects
 * (CLAUDE.md #9 — zero allocation in `update()`), not Phaser's
 * `ParticleEmitter`: every trail needs a value only known at the exact
 * spawn instant (the player's current velocity, a per-particle color pick),
 * which a declarative emitter config can't express, while a five-field pool
 * entry can.
 */
export class TrailFx {
  private readonly kind: TrailKind;
  private readonly pool: Particle[];
  private lastSpawnMs = -Infinity;
  private dropFrameCounter = 0;

  // beep7 only
  private droneBody: Phaser.GameObjects.Rectangle | null = null;
  private droneLamp: Phaser.GameObjects.Rectangle | null = null;
  private droneX = 0;
  private droneY = 0;

  constructor(scene: Phaser.Scene, kind: TrailKind, spawnX: number, spawnY: number) {
    this.kind = kind;
    const limit = kind === 'data_trail' ? 24 : kind === 'launch' ? 16 : kind === 'interference' ? 12 : 3;
    this.pool = makePool(scene, limit, kind === 'data_trail');

    if (kind === 'beep7') {
      this.droneX = spawnX;
      this.droneY = spawnY;
      this.droneBody = scene.add.rectangle(spawnX, spawnY, 8, 3, PALETTE.metalEdge, 1);
      this.droneLamp = scene.add
        .rectangle(spawnX, spawnY + 3, 2, 2, PALETTE.system, 1)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  /** Spawns run before `stepPool` so anything spawned this frame (here or via `onJump`, called earlier in the same frame from `Player.preUpdate`) gets its frac-0 position/size/color applied immediately instead of flashing one frame late at its pooled slot's stale transform. */
  update(elapsedMs: number, deltaMs: number, player: TrailPlayerState, isAlive: boolean): void {
    // A trail is particles, and particles are the first thing CLAUDE.md #9
    // sheds under load. Existing ones are still stepped below so they fade
    // out instead of freezing mid-air; only new ones stop being made.
    if (isAlive && FxQuality.particlesAllowed()) {
      switch (this.kind) {
        case 'data_trail':
          this.updateDataTrail(elapsedMs, player);
          break;
        case 'interference':
          this.updateInterference(elapsedMs, player);
          break;
        case 'beep7':
          this.updateDrone(elapsedMs, player);
          break;
        case 'launch':
          break; // launch only spawns on `onJump`, nothing continuous to update
      }
    }

    stepPool(this.pool, deltaMs);
  }

  private updateDataTrail(elapsedMs: number, player: TrailPlayerState): void {
    if (Math.abs(player.vx) <= 40) return;
    if (elapsedMs - this.lastSpawnMs < DATA_TRAIL_INTERVAL_MS) return;
    this.lastSpawnMs = elapsedMs;

    spawn(this.pool, {
      x: player.x + (Math.random() * 4 - 2),
      y: player.y,
      vx: player.vx * -0.2,
      vy: -6,
      gravityY: 0,
      lifeMs: 320,
      colorFrom: PALETTE.cyan,
      colorTo: PALETTE.cyanDim,
      sizeAt: (frac) => {
        const side = frac < 0.6 ? 2 : Math.round(2 - (frac - 0.6) / 0.4);
        return { w: side, h: side };
      },
      alphaAt: (frac) => 1 - frac,
    });
  }

  private updateInterference(elapsedMs: number, player: TrailPlayerState): void {
    if (player.vy <= 220) return;
    if (elapsedMs - this.lastSpawnMs < INTERFERENCE_INTERVAL_MS) return;
    this.lastSpawnMs = elapsedMs;

    const streakColor = Math.random() < 0.5 ? PALETTE.white : PALETTE.metalEdge;
    const width = player.vy > 400 ? 7 : 5;
    spawn(this.pool, {
      x: player.x + (Math.random() * 20 - 10),
      y: player.y - PLAYER_SPRITE_H,
      vx: 0,
      vy: 0,
      gravityY: 0,
      lifeMs: 180,
      colorFrom: streakColor,
      colorTo: streakColor,
      sizeAt: () => ({ w: width, h: 1 }),
      alphaAt: (frac) => (frac < 0.25 ? 1 : frac < 0.5 ? 0.6 : frac < 0.75 ? 0.25 : 0),
    });
  }

  /** Ground-jump burst — called once per real jump (`GameplayScene`'s `player:jumped` handler), not from `update()`. */
  onJump(x: number, y: number): void {
    if (this.kind !== 'launch' || !FxQuality.particlesAllowed()) return;
    for (let i = 0; i < 8; i++) {
      const angleDeg = 90 + (Math.random() * 100 - 50);
      const angleRad = (angleDeg * Math.PI) / 180;
      const speed = 60 + Math.random() * 50;
      const color = Math.random() < 0.6 ? PALETTE.reward : PALETTE.dangerAlt;
      spawn(this.pool, {
        x,
        y,
        vx: Math.cos(angleRad) * speed,
        vy: Math.sin(angleRad) * speed,
        gravityY: 180,
        lifeMs: 420,
        colorFrom: color,
        colorTo: color,
        sizeAt: (frac) => {
          const side = frac < 1 / 3 ? 3 : frac < 2 / 3 ? 2 : 1;
          return { w: side, h: side };
        },
        alphaAt: (frac) => (frac < 0.7 ? 1 : 1 - (frac - 0.7) / 0.3),
      });
    }
  }

  private updateDrone(elapsedMs: number, player: TrailPlayerState): void {
    if (!this.droneBody || !this.droneLamp) return;

    const facing = player.flipX ? -1 : 1;
    const targetX = player.x - facing * 22;
    const targetY = player.y - 16;
    this.droneX += (targetX - this.droneX) * DRONE_LERP;
    this.droneY += (targetY - this.droneY) * DRONE_LERP;

    const bob = Math.sin((elapsedMs / DRONE_BOB_PERIOD_MS) * Math.PI * 2) * 2;
    const drawX = Math.round(this.droneX);
    const drawY = Math.round(this.droneY + bob);
    this.droneBody.setPosition(drawX, drawY);
    this.droneLamp.setPosition(drawX, drawY + 3);

    this.dropFrameCounter++;
    if (this.dropFrameCounter >= DROP_EVERY_FRAMES) {
      this.dropFrameCounter = 0;
      spawn(this.pool, {
        x: this.droneLamp.x,
        y: this.droneLamp.y,
        vx: 0,
        vy: 30,
        gravityY: 0,
        lifeMs: 260,
        colorFrom: PALETTE.system,
        colorTo: PALETTE.system,
        sizeAt: () => ({ w: 1, h: 1 }),
        alphaAt: (frac) => 0.5 * (1 - frac),
      });
    }
  }

  /** Dims BEEP-7's lamp for a beat on death — reads as a reaction, never as damage (the drone has no collider and can't be hurt). No-op for every other trail. */
  onPlayerDeath(scene: Phaser.Scene): void {
    if (this.kind !== 'beep7' || !this.droneLamp) return;
    this.droneLamp.setFillStyle(PALETTE.metalEdge, 1);
    scene.time.delayedCall(DRONE_DIM_MS, () => {
      this.droneLamp?.setFillStyle(PALETTE.system, 1);
    });
  }

  destroy(): void {
    destroyPool(this.pool);
    this.droneBody?.destroy();
    this.droneLamp?.destroy();
  }
}
