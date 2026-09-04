import { getAllLevels } from '@/gameplay/LevelFactory';
import { readJson, writeJson } from '@/utils/safeStorage';
import { YandexGamesService } from './YandexGamesService';

const STORAGE_KEY = 'itknows.save.v1';
const CLOUD_KEY = 'save';
const SAVE_VERSION = 1;

interface SaveDataV1 {
  version: 1;
  completedLevels: string[];
  lastLevelId: string | null;
}

function emptySave(): SaveDataV1 {
  return { version: SAVE_VERSION, completedLevels: [], lastLevelId: null };
}

function parseSave(raw: unknown): SaveDataV1 {
  const parsed = raw as Partial<SaveDataV1> | null;
  if (!parsed || parsed.version !== SAVE_VERSION || !Array.isArray(parsed.completedLevels)) return emptySave();
  return {
    version: SAVE_VERSION,
    completedLevels: parsed.completedLevels.filter((id): id is string => typeof id === 'string'),
    lastLevelId: typeof parsed.lastLevelId === 'string' ? parsed.lastLevelId : null,
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
function mergeSaves(local: SaveDataV1, cloud: SaveDataV1): SaveDataV1 {
  return {
    version: SAVE_VERSION,
    completedLevels: Array.from(new Set([...local.completedLevels, ...cloud.completedLevels])),
    lastLevelId: local.lastLevelId ?? cloud.lastLevelId,
  };
}

/**
 * Guest/local progress, source of truth in `localStorage` (CLAUDE.md #8),
 * with the Yandex cloud (`player.getData`/`setData`) as a best-effort sync
 * layer on top for authorized players — a disconnected/guest/unavailable SDK
 * degrades to exactly the localStorage-only behavior this had before cloud
 * sync existed, never breaking or blocking on the network. Version
 * migrations and corrupt-save recovery beyond "fall back to a clean save"
 * are still open `TODO.md` Phase 6 items.
 */
class SaveServiceController {
  private data: SaveDataV1 = parseSave(readJson(STORAGE_KEY));
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

  /** Test-only reset — never called from gameplay/UI code. */
  resetForTests(): void {
    this.data = emptySave();
    this.cloudSyncStarted = false;
  }
}

export const SaveService = new SaveServiceController();
