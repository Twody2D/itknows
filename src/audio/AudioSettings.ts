import { readJson, writeJson } from '@/utils/safeStorage';
import { AudioEngine } from './AudioEngine';

const STORAGE_KEY = 'itknows.audio.v1';
const SETTINGS_VERSION = 1;

interface AudioSettingsDataV1 {
  version: 1;
  muted: boolean;
}

function defaults(): AudioSettingsDataV1 {
  return { version: SETTINGS_VERSION, muted: false };
}

function parse(raw: unknown): AudioSettingsDataV1 {
  const parsed = raw as Partial<AudioSettingsDataV1> | null;
  if (!parsed || parsed.version !== SETTINGS_VERSION || typeof parsed.muted !== 'boolean') return defaults();
  return { version: SETTINGS_VERSION, muted: parsed.muted };
}

/**
 * Session- and reload-persisted sound preference (master-prompt §32 "mute...
 * Сохранить настройки"). A single on/off switch for now — there's no music
 * layer yet to need a separate music/SFX split, so one `muted` flag covers
 * the whole "sound" concept until Phase 5's sequencer exists.
 */
class AudioSettingsController {
  private data: AudioSettingsDataV1 = parse(readJson(STORAGE_KEY));

  constructor() {
    AudioEngine.setMuted(this.data.muted);
  }

  get muted(): boolean {
    return this.data.muted;
  }

  setMuted(muted: boolean): void {
    if (this.data.muted === muted) return;
    this.data.muted = muted;
    AudioEngine.setMuted(muted);
    writeJson(STORAGE_KEY, this.data);
  }

  toggle(): boolean {
    this.setMuted(!this.data.muted);
    return this.data.muted;
  }

  /** Test-only reset — never called from gameplay/UI code. */
  resetForTests(): void {
    this.data = defaults();
    AudioEngine.setMuted(false);
  }
}

export const AudioSettings = new AudioSettingsController();
