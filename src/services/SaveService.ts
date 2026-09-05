import { getAllLevels } from '@/gameplay/LevelFactory';
import { readJson, writeJson } from '@/utils/safeStorage';
import { YandexGamesService } from './YandexGamesService';

const STORAGE_KEY = 'itknows.save.v1';
const CLOUD_KEY = 'save';
const SAVE_VERSION = 3;

/** Everything the shop grants/tracks — `default`/`static`/`standard` are owned+equipped from a fresh save (CurrencyService/InventoryService read this, never a second save file). */
export interface InventoryData {
  ownedSkins: string[];
  ownedDeathFx: string[];
  ownedSystemPacks: string[];
  ownedPremium: string[];
  equippedSkin: string;
  equippedDeathFx: string;
  equippedSystemPack: string;
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

interface SaveDataV3 {
  version: 3;
  completedLevels: string[];
  lastLevelId: string | null;
  credits: number;
  inventory: InventoryData;
  /** Yandex purchase tokens already granted — the idempotency guard against a double-processed or replayed purchase (master-prompt §6/§44 scenario F). */
  processedPurchaseTokens: string[];
  /** Keyed by `${levelId}::${variantId}` (GhostService owns that scheme) — one best-run trace per level+variant, since different variants have different geometry (CLAUDE.md #4.3). */
  ghosts: Record<string, GhostRecord>;
}

function defaultInventory(): InventoryData {
  return {
    ownedSkins: ['default'],
    ownedDeathFx: ['static'],
    ownedSystemPacks: ['standard'],
    ownedPremium: [],
    equippedSkin: 'default',
    equippedDeathFx: 'static',
    equippedSystemPack: 'standard',
  };
}

function emptySave(): SaveDataV3 {
  return {
    version: SAVE_VERSION,
    completedLevels: [],
    lastLevelId: null,
    credits: 0,
    inventory: defaultInventory(),
    processedPurchaseTokens: [],
    ghosts: {},
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
    ownedPremium: sanitizeStringArray(parsed.ownedPremium),
    equippedSkin: typeof parsed.equippedSkin === 'string' ? parsed.equippedSkin : fallback.equippedSkin,
    equippedDeathFx: typeof parsed.equippedDeathFx === 'string' ? parsed.equippedDeathFx : fallback.equippedDeathFx,
    equippedSystemPack:
      typeof parsed.equippedSystemPack === 'string' ? parsed.equippedSystemPack : fallback.equippedSystemPack,
  };
}

/** Loose shape covering a v1/v2/v3 payload — `version` is the only field whose type actually conflicts between them, so it's widened here rather than intersected. */
type AnySaveShape = Partial<Omit<SaveDataV3, 'version'>> & { version?: unknown };

/** Drops anything that isn't a plausible `[t,x,y,facing]×N` trace — a corrupt/truncated entry is dropped whole rather than replayed as a broken ghost. */
function sanitizeGhostRecord(raw: unknown): GhostRecord | null {
  const parsed = raw as Partial<GhostRecord> | null;
  if (!parsed || typeof parsed !== 'object') return null;
  if (typeof parsed.timeMs !== 'number' || !Number.isFinite(parsed.timeMs) || parsed.timeMs < 0) return null;
  if (!Array.isArray(parsed.samples) || parsed.samples.length % 4 !== 0) return null;
  if (!parsed.samples.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  return { timeMs: parsed.timeMs, samples: parsed.samples };
}

function sanitizeGhosts(raw: unknown): Record<string, GhostRecord> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, GhostRecord> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const record = sanitizeGhostRecord(value);
    if (record) result[key] = record;
  }
  return result;
}

/** A v1/v2 save (or anything unrecognized) migrates forward with sane shop defaults and no ghost data yet — never a hard failure, same "fall back to a clean save" posture v1 already had for a fully malformed payload. */
function parseSave(raw: unknown): SaveDataV3 {
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
    ownedPremium: unionArrays(local.ownedPremium, cloud.ownedPremium),
    equippedSkin: local.equippedSkin,
    equippedDeathFx: local.equippedDeathFx,
    equippedSystemPack: local.equippedSystemPack,
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

function mergeSaves(local: SaveDataV3, cloud: SaveDataV3): SaveDataV3 {
  return {
    version: SAVE_VERSION,
    completedLevels: unionArrays(local.completedLevels, cloud.completedLevels),
    lastLevelId: local.lastLevelId ?? cloud.lastLevelId,
    credits: Math.max(local.credits, cloud.credits),
    inventory: mergeInventory(local.inventory, cloud.inventory),
    processedPurchaseTokens: unionArrays(local.processedPurchaseTokens, cloud.processedPurchaseTokens),
    ghosts: mergeGhosts(local.ghosts, cloud.ghosts),
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
  private data: SaveDataV3 = parseSave(readJson(STORAGE_KEY));
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

  // --- Ghost (GhostService owns the `${levelId}::${variantId}` key scheme — see its doc comment) ---

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
