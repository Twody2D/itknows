import { readJson, writeJson } from '@/utils/safeStorage';

const STORAGE_KEY = 'itknows.ghost.v1';
const SETTINGS_VERSION = 1;

interface GhostSettingsDataV1 {
  version: 1;
  enabled: boolean;
}

function defaults(): GhostSettingsDataV1 {
  // Off by default — owner feedback after trying it live: an unrequested
  // second character running the level felt distracting rather than
  // helpful. The recording itself is unconditional (see this file's own
  // doc comment), so switching this on later loses nothing already earned.
  return { version: SETTINGS_VERSION, enabled: false };
}

function parse(raw: unknown): GhostSettingsDataV1 {
  const parsed = raw as Partial<GhostSettingsDataV1> | null;
  if (!parsed || parsed.version !== SETTINGS_VERSION || typeof parsed.enabled !== 'boolean') return defaults();
  return { version: SETTINGS_VERSION, enabled: parsed.enabled };
}

/**
 * Session- and reload-persisted "show my best-run ghost" preference
 * (master-prompt §40 — "отключаемый"). Purely a display toggle: recording
 * a level's trace and saving it as a personal best (`GhostService`) always
 * happens regardless of this flag, so turning ghosts off and back on never
 * loses progress toward one.
 */
class GhostSettingsController {
  private data: GhostSettingsDataV1 = parse(readJson(STORAGE_KEY));

  get enabled(): boolean {
    return this.data.enabled;
  }

  setEnabled(enabled: boolean): void {
    if (this.data.enabled === enabled) return;
    this.data.enabled = enabled;
    writeJson(STORAGE_KEY, this.data);
  }

  toggle(): boolean {
    this.setEnabled(!this.data.enabled);
    return this.data.enabled;
  }

  /** Test-only reset — never called from gameplay/UI code. */
  resetForTests(): void {
    this.data = defaults();
  }
}

export const GhostSettings = new GhostSettingsController();
