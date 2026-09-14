import { getAllLevels } from '@/gameplay/LevelFactory';
import { readJson, writeJson } from '@/utils/safeStorage';
import { YandexGamesService } from './YandexGamesService';

const STORAGE_KEY = 'itknows.save.v1';
const CLOUD_KEY = 'save';
const SAVE_VERSION = 6;

/** Everything the shop grants/tracks — `default`/`static`/`standard` are owned+equipped from a fresh save (CurrencyService/InventoryService read this, never a second save file). */
export interface InventoryData {
  ownedSkins: string[];
  ownedDeathFx: string[];
  ownedSystemPacks: string[];
  ownedTrails: string[];
  ownedPremium: string[];
  equippedSkin: string;
  equippedDeathFx: string;
  equippedSystemPack: string;
  equippedTrail: string;
}

/**
 * One level's best-run trace (master-prompt §40) — `timeMs` is the same
 * completion clock used for the leaderboard/`level:completed` (not just the
 * winning attempt's own duration), so "personal best" means one thing
 * everywhere. `samples` is a flat `[t,x,y,facing]×N` array rather than an
 * array of objects — no repeated key names, smaller JSON, and this is the
 * one save field with any real potential to grow (see GhostRecorder's
 * MAX_SAMPLES cap and this file's `sanitizeGhosts`).
 */
export interface GhostRecord {
  timeMs: number;
  samples: number[];
}

/**
 * Today's Daily Challenge, and only today's.
 *
 * One UTC date at a time (`DailyChallenge.dailyChallengeDateKey`): when the
 * date rolls over, every field below is replaced rather than accumulated.
 * A daily run is a side event, not campaign progress — it never touches
 * `completedLevels` or `lastLevelId`, so clearing today's challenge cannot
 * skip a player forward through the campaign or backwards to a level they
 * already finished.
 *
 * `continuesUsed` is the whole reason this is persisted rather than held in
 * memory: the rewarded continue (CLAUDE.md #8) has to survive a reload, or
 * the limit is not a limit.
 */
export interface DailyRecord {
  date: string;
  /** Fastest completed run today, or `null` if today has not been cleared yet. */
  bestTimeMs: number | null;
  /** Deaths on that fastest run — reported next to the time, never a separate best. */
  bestDeaths: number | null;
  /** Rewarded continues already spent today. See `DAILY_MAX_CONTINUES`. */
  continuesUsed: number;
}

/** Rewarded continues a player may take per day. One: enough to rescue a good run, not enough to make the life limit decorative (CLAUDE.md #8 — ads are voluntary and never required to finish anything). */
export const DAILY_MAX_CONTINUES = 1;

/** Lives in a daily run before it ends. The "ограниченные условия" of master-prompt §74 — the campaign itself stays unlimited-retry. */
export const DAILY_LIVES = 3;

function emptyDaily(date = ''): DailyRecord {
  return { date, bestTimeMs: null, bestDeaths: null, continuesUsed: 0 };
}

interface SaveDataV6 {
  version: 6;
  completedLevels: string[];
  lastLevelId: string | null;
  credits: number;
  inventory: InventoryData;
  /** Yandex purchase tokens already granted — the idempotency guard against a double-processed or replayed purchase (master-prompt §6/§44 scenario F). */
  processedPurchaseTokens: string[];
  /** Keyed by level id — one best-run trace per level. It used to carry a `::variantId` suffix, from back when a level had adaptive cuts with different geometry; `parseSave` strips that suffix forward. */
  ghosts: Record<string, GhostRecord>;
  /** Keyed by `sector-01`-style id (`sectors.ts`'s `sectorIdOf`) — best `GameState.sectorElapsedMs()` ever posted for that sector, shown as BEST on `SectorCompleteScene`. No per-variant split like ghosts: a sector's time already blends whatever variant each of its levels happened to serve, so there's no single "canonical" sector run to isolate. */
  sectorBests: Record<string, number>;
  /** Today's Daily Challenge only — see `DailyRecord`. */
  daily: DailyRecord;
}

function defaultInventory(): InventoryData {
  return {
    ownedSkins: ['default'],
    ownedDeathFx: ['static'],
    ownedSystemPacks: ['standard'],
    ownedTrails: ['data_trail'],
    ownedPremium: [],
    equippedSkin: 'default',
    equippedDeathFx: 'static',
    equippedSystemPack: 'standard',
    equippedTrail: 'data_trail',
  };
}

function emptySave(): SaveDataV6 {
  return {
    version: SAVE_VERSION,
    completedLevels: [],
    lastLevelId: null,
    credits: 0,
    inventory: defaultInventory(),
    processedPurchaseTokens: [],
    ghosts: {},
    sectorBests: {},
    daily: emptyDaily(),
  };
}

function sanitizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

function sanitizeInventory(raw: unknown): InventoryData {
  const parsed = raw as Partial<InventoryData> | null;
  const fallback = defaultInventory();
  if (!parsed || typeof parsed !== 'object') return fallback;
  return {
    ownedSkins: sanitizeStringArray(parsed.ownedSkins).length ? sanitizeStringArray(parsed.ownedSkins) : fallback.ownedSkins,
    ownedDeathFx: sanitizeStringArray(parsed.ownedDeathFx).length
      ? sanitizeStringArray(parsed.ownedDeathFx)
      : fallback.ownedDeathFx,
    ownedSystemPacks: sanitizeStringArray(parsed.ownedSystemPacks).length
      ? sanitizeStringArray(parsed.ownedSystemPacks)
      : fallback.ownedSystemPacks,
    ownedTrails: sanitizeStringArray(parsed.ownedTrails).length ? sanitizeStringArray(parsed.ownedTrails) : fallback.ownedTrails,
    ownedPremium: sanitizeStringArray(parsed.ownedPremium),
    equippedSkin: typeof parsed.equippedSkin === 'string' ? parsed.equippedSkin : fallback.equippedSkin,
    equippedDeathFx: typeof parsed.equippedDeathFx === 'string' ? parsed.equippedDeathFx : fallback.equippedDeathFx,
    equippedSystemPack:
      typeof parsed.equippedSystemPack === 'string' ? parsed.equippedSystemPack : fallback.equippedSystemPack,
    equippedTrail: typeof parsed.equippedTrail === 'string' ? parsed.equippedTrail : fallback.equippedTrail,
  };
}

/** Loose shape covering a v1/v2/v3/v4/v5 payload — `version` is the only field whose type actually conflicts between them, so it's widened here rather than intersected. */
type AnySaveShape = Partial<Omit<SaveDataV6, 'version'>> & { version?: unknown };

/** Drops anything that isn't a plausible `[t,x,y,facing]×N` trace — a corrupt/truncated entry is dropped whole rather than replayed as a broken ghost. */
function sanitizeGhostRecord(raw: unknown): GhostRecord | null {
  const parsed = raw as Partial<GhostRecord> | null;
  if (!parsed || typeof parsed !== 'object') return null;
  if (typeof parsed.timeMs !== 'number' || !Number.isFinite(parsed.timeMs) || parsed.timeMs < 0) return null;
  if (!Array.isArray(parsed.samples) || parsed.samples.length % 4 !== 0) return null;
  if (!parsed.samples.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  return { timeMs: parsed.timeMs, samples: parsed.samples };
}

/**
 * Ghost keys lost their `::variantId` suffix when the adaptive variants were
 * removed, and this is where an existing save catches up rather than losing
 * its personal bests (CLAUDE.md #8 — progress is never lost).
 *
 * Only the canonical `::standard` traces carry forward: a trace recorded in
 * a `gentle` or `bold` cut was run through geometry that no longer exists,
 * so replaying it against the one remaining shape would show a ghost
 * clipping walls. Those are dropped, which costs a player a replay overlay
 * and nothing else. Where a save somehow holds both, the faster wins.
 */
function sanitizeGhosts(raw: unknown): Record<string, GhostRecord> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, GhostRecord> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const record = sanitizeGhostRecord(value);
    if (!record) continue;
    const legacy = key.indexOf('::');
    if (legacy === -1) {
      const existing = result[key];
      if (!existing || record.timeMs < existing.timeMs) result[key] = record;
      continue;
    }
    if (key.slice(legacy + 2) !== 'standard') continue;
    const levelId = key.slice(0, legacy);
    const existing = result[levelId];
    if (!existing || record.timeMs < existing.timeMs) result[levelId] = record;
  }
  return result;
}

function sanitizeSectorBests(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) result[key] = value;
  }
  return result;
}

function sanitizeDaily(value: unknown): DailyRecord {
  const raw = value as Partial<DailyRecord> | null | undefined;
  if (!raw || typeof raw.date !== 'string') return emptyDaily();
  const positiveOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  return {
    date: raw.date,
    bestTimeMs: positiveOrNull(raw.bestTimeMs),
    bestDeaths: positiveOrNull(raw.bestDeaths),
    continuesUsed: Number.isInteger(raw.continuesUsed) && (raw.continuesUsed as number) >= 0 ? (raw.continuesUsed as number) : 0,
  };
}

/** A v1/v2 save (or anything unrecognized) migrates forward with sane shop defaults and no ghost data yet — never a hard failure, same "fall back to a clean save" posture v1 already had for a fully malformed payload. */
function parseSave(raw: unknown): SaveDataV6 {
  const parsed = raw as AnySaveShape | null;
  if (!parsed || !Array.isArray(parsed.completedLevels)) return emptySave();

  const completedLevels = sanitizeStringArray(parsed.completedLevels);
  const lastLevelId = typeof parsed.lastLevelId === 'string' ? parsed.lastLevelId : null;

  if (parsed.version !== SAVE_VERSION) {
    return { ...emptySave(), completedLevels, lastLevelId };
  }

  return {
    version: SAVE_VERSION,
    completedLevels,
    lastLevelId,
    credits: Number.isInteger(parsed.credits) && (parsed.credits as number) >= 0 ? (parsed.credits as number) : 0,
    inventory: sanitizeInventory(parsed.inventory),
    processedPurchaseTokens: sanitizeStringArray(parsed.processedPurchaseTokens),
    ghosts: sanitizeGhosts(parsed.ghosts),
    sectorBests: sanitizeSectorBests(parsed.sectorBests),
    daily: sanitizeDaily(parsed.daily),
  };
}

/**
 * Union completed levels from both sides (progress never regresses,
 * CLAUDE.md #8) and prefer this device's own `lastLevelId` — it reflects
 * where this session is actually about to continue, and only falls back to
 * the cloud's when this device has never played at all. **Known scope
 * limit**: a device that resumes with stale local data still overwrites the
 * cloud's `lastLevelId` with its own on the next push — this is a
 * completed-levels merge, not full multi-device state reconciliation. That
 * would need real conflict resolution (timestamps, a version vector), which
 * is out of scope for this slice; the honest guarantee here is narrower but
 * real: "cloud sync means you never lose *completed levels* by switching
 * devices," not "every field always reflects your most recent device."
 */
function unionArrays(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b]));
}

/** Shop fields follow the same "never regress" contract as `completedLevels` above: owned sets and tokens union, credits take the higher side, equipped choices stay this device's own (mirrors `lastLevelId`, a UI preference rather than progress). */
function mergeInventory(local: InventoryData, cloud: InventoryData): InventoryData {
  return {
    ownedSkins: unionArrays(local.ownedSkins, cloud.ownedSkins),
    ownedDeathFx: unionArrays(local.ownedDeathFx, cloud.ownedDeathFx),
    ownedSystemPacks: unionArrays(local.ownedSystemPacks, cloud.ownedSystemPacks),
    ownedTrails: unionArrays(local.ownedTrails, cloud.ownedTrails),
    ownedPremium: unionArrays(local.ownedPremium, cloud.ownedPremium),
    equippedSkin: local.equippedSkin,
    equippedDeathFx: local.equippedDeathFx,
    equippedSystemPack: local.equippedSystemPack,
    equippedTrail: local.equippedTrail,
  };
}

/** Per key, keep whichever side actually ran faster — a ghost's whole point is being a personal best, so unlike the "never regress" fields above, a slower run genuinely should lose here rather than union. */
function mergeGhosts(local: Record<string, GhostRecord>, cloud: Record<string, GhostRecord>): Record<string, GhostRecord> {
  const result: Record<string, GhostRecord> = { ...local };
  for (const [key, cloudGhost] of Object.entries(cloud)) {
    const localGhost = result[key];
    if (!localGhost || cloudGhost.timeMs < localGhost.timeMs) result[key] = cloudGhost;
  }
  return result;
}

/** Per key, keep whichever side actually ran faster — same "faster wins" rule as `mergeGhosts`, just without a samples payload to carry along. */
function mergeSectorBests(local: Record<string, number>, cloud: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = { ...local };
  for (const [key, cloudTimeMs] of Object.entries(cloud)) {
    const localTimeMs = result[key];
    if (localTimeMs === undefined || cloudTimeMs < localTimeMs) result[key] = cloudTimeMs;
  }
  return result;
}

/**
 * Only the same date merges, and then conservatively: the faster time wins
 * and the continues taken on EITHER device count against the day's
 * allowance. Different dates means one of the two is yesterday's — the
 * local one is kept and `getDaily` rolls it over on the next read, rather
 * than resurrecting a stale day from the cloud.
 */
function mergeDaily(local: DailyRecord, cloud: DailyRecord): DailyRecord {
  if (local.date !== cloud.date) return local;
  const faster = cloud.bestTimeMs !== null && (local.bestTimeMs === null || cloud.bestTimeMs < local.bestTimeMs);
  return {
    date: local.date,
    bestTimeMs: faster ? cloud.bestTimeMs : local.bestTimeMs,
    bestDeaths: faster ? cloud.bestDeaths : local.bestDeaths,
    continuesUsed: Math.max(local.continuesUsed, cloud.continuesUsed),
  };
}

function mergeSaves(local: SaveDataV6, cloud: SaveDataV6): SaveDataV6 {
  return {
    version: SAVE_VERSION,
    completedLevels: unionArrays(local.completedLevels, cloud.completedLevels),
    lastLevelId: local.lastLevelId ?? cloud.lastLevelId,
    credits: Math.max(local.credits, cloud.credits),
    inventory: mergeInventory(local.inventory, cloud.inventory),
    processedPurchaseTokens: unionArrays(local.processedPurchaseTokens, cloud.processedPurchaseTokens),
    ghosts: mergeGhosts(local.ghosts, cloud.ghosts),
    sectorBests: mergeSectorBests(local.sectorBests, cloud.sectorBests),
    daily: mergeDaily(local.daily, cloud.daily),
  };
}

/**
 * Guest/local progress, source of truth in `localStorage` (CLAUDE.md #8),
 * with the Yandex cloud (`player.getData`/`setData`) as a best-effort sync
 * layer on top for authorized players — a disconnected/guest/unavailable SDK
 * degrades to exactly the localStorage-only behavior this had before cloud
 * sync existed, never breaking or blocking on the network. `parseSave`
 * migrates a v1 payload forward with shop defaults (`emptySave()`'s
 * `credits`/`inventory`/`processedPurchaseTokens`) rather than wiping it —
 * see `parseSave`'s own doc comment. Corrupt-save recovery beyond "fall back
 * to sane defaults, field by field" is still an open `TODO.md` item.
 */
class SaveServiceController {
  private data: SaveDataV6 = parseSave(readJson(STORAGE_KEY));
  private cloudSyncStarted = false;

  private persist(): void {
    writeJson(STORAGE_KEY, this.data);
    this.pushToCloud();
  }

  private pushToCloud(): void {
    if (!YandexGamesService.isAvailable()) return;
    void YandexGamesService.setPlayerData({ [CLOUD_KEY]: JSON.stringify(this.data) });
  }

  /**
   * Call once, after the SDK has had a chance to initialize (`main.ts`,
   * chained off `YandexGamesService.init()`). Pulls whatever the cloud has,
   * merges it into the local save (see `mergeSaves`), persists the result,
   * then pushes the merged save back — so the cloud converges too, not just
   * this device. Safe to call multiple times; only the first call does
   * anything. Never throws, never blocks anything else on the network —
   * `SaveService`'s synchronous API already works before this ever resolves.
   */
  async syncWithCloud(): Promise<void> {
    if (this.cloudSyncStarted) return;
    this.cloudSyncStarted = true;
    if (!YandexGamesService.isAvailable()) return;

    const cloud = await YandexGamesService.getPlayerData([CLOUD_KEY]);
    const rawSave = cloud?.[CLOUD_KEY];
    if (typeof rawSave === 'string') {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawSave);
      } catch {
        parsedJson = null;
      }
      if (parsedJson !== null) {
        this.data = mergeSaves(this.data, parseSave(parsedJson));
        writeJson(STORAGE_KEY, this.data);
      }
    }
    this.pushToCloud();
  }

  isCompleted(levelId: string): boolean {
    return this.data.completedLevels.includes(levelId);
  }

  getCompletedLevels(): readonly string[] {
    return this.data.completedLevels;
  }

  markCompleted(levelId: string): void {
    if (this.data.completedLevels.includes(levelId)) return;
    this.data.completedLevels.push(levelId);
    this.persist();
  }

  setLastLevelId(levelId: string): void {
    if (this.data.lastLevelId === levelId) return;
    this.data.lastLevelId = levelId;
    this.persist();
  }

  /** Where PLAY should resume: the level last opened, or the campaign's first level for a brand-new save. */
  getResumeLevelId(): string {
    return this.data.lastLevelId ?? getAllLevels()[0]!.id;
  }

  // --- Shop (CurrencyService/InventoryService/PurchaseManager wrap these — one save file, CLAUDE.md #8/master-prompt §19) ---

  getCredits(): number {
    return this.data.credits;
  }

  setCredits(credits: number): void {
    if (this.data.credits === credits) return;
    this.data.credits = credits;
    this.persist();
  }

  getInventory(): InventoryData {
    return this.data.inventory;
  }

  setInventory(inventory: InventoryData): void {
    this.data.inventory = inventory;
    this.persist();
  }

  hasProcessedPurchase(token: string): boolean {
    return this.data.processedPurchaseTokens.includes(token);
  }

  markPurchaseProcessed(token: string): void {
    if (this.data.processedPurchaseTokens.includes(token)) return;
    this.data.processedPurchaseTokens.push(token);
    this.persist();
  }

  // --- Ghost (keyed by level id — see `GhostService`) ---

  getGhost(key: string): GhostRecord | null {
    return this.data.ghosts[key] ?? null;
  }

  /** No-ops unless this beats the stored best (or there is none yet) — "personal best" is enforced here, once, rather than trusted to every caller. */
  saveGhostIfBest(key: string, timeMs: number, samples: readonly number[]): void {
    const existing = this.data.ghosts[key];
    if (existing && existing.timeMs <= timeMs) return;
    this.data.ghosts[key] = { timeMs, samples: [...samples] };
    this.persist();
  }

  // --- Sector best time (SectorCompleteScene's BEST — see `sectorBests`'s own doc comment) ---

  getSectorBestMs(sectorId: string): number | null {
    return this.data.sectorBests[sectorId] ?? null;
  }

  /** No-ops unless this beats the stored best (or there is none yet) — same enforcement posture as `saveGhostIfBest`. */
  saveSectorBestIfFaster(sectorId: string, timeMs: number): void {
    const existing = this.data.sectorBests[sectorId];
    if (existing !== undefined && existing <= timeMs) return;
    this.data.sectorBests[sectorId] = timeMs;
    this.persist();
  }

  // --- Daily Challenge (one UTC date at a time — see `DailyRecord`) ---

  /**
   * Today's record, rolled over first: asking about a new date clears
   * yesterday's rather than reporting it. Every other daily accessor goes
   * through this, so a stale date can never be read as if it were today's.
   */
  getDaily(date: string): DailyRecord {
    if (this.data.daily.date !== date) {
      this.data.daily = emptyDaily(date);
      this.persist();
    }
    return this.data.daily;
  }

  /** No-ops unless this beats today's stored time — same enforcement posture as `saveGhostIfBest`. */
  saveDailyResult(date: string, timeMs: number, deaths: number): void {
    const daily = this.getDaily(date);
    if (daily.bestTimeMs !== null && daily.bestTimeMs <= timeMs) return;
    daily.bestTimeMs = timeMs;
    daily.bestDeaths = deaths;
    this.persist();
  }

  /** True while the player still has a rewarded continue left today. */
  canUseDailyContinue(date: string): boolean {
    return this.getDaily(date).continuesUsed < DAILY_MAX_CONTINUES;
  }

  /** Spends one. Returns false (and spends nothing) once the day's allowance is gone — the limit is enforced here, once, not trusted to the UI. */
  useDailyContinue(date: string): boolean {
    const daily = this.getDaily(date);
    if (daily.continuesUsed >= DAILY_MAX_CONTINUES) return false;
    daily.continuesUsed += 1;
    this.persist();
    return true;
  }

  /** Resets only the shop fields (credits/inventory/processed tokens) back to a fresh save's defaults — level progress (`completedLevels`/`lastLevelId`) is untouched. Used by `ShopDevTools`; harmless enough to also back a future "reset purchases" settings option. */
  resetShopState(): void {
    this.data.credits = 0;
    this.data.inventory = defaultInventory();
    this.data.processedPurchaseTokens = [];
    this.persist();
  }

  /** Test-only reset — never called from gameplay/UI code. */
  resetForTests(): void {
    this.data = emptySave();
    this.cloudSyncStarted = false;
  }
}

export const SaveService = new SaveServiceController();
