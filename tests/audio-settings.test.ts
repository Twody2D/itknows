import { beforeEach, describe, expect, it } from 'vitest';
import { AudioSettings } from '@/audio/AudioSettings';

describe('AudioSettings', () => {
  beforeEach(() => {
    AudioSettings.resetForTests();
  });

  it('starts unmuted by default', () => {
    expect(AudioSettings.muted).toBe(false);
  });

  it('toggle() flips and returns the new muted state', () => {
    expect(AudioSettings.toggle()).toBe(true);
    expect(AudioSettings.muted).toBe(true);
    expect(AudioSettings.toggle()).toBe(false);
    expect(AudioSettings.muted).toBe(false);
  });

  it('setMuted is idempotent for the same value', () => {
    AudioSettings.setMuted(true);
    AudioSettings.setMuted(true);
    expect(AudioSettings.muted).toBe(true);
  });
});
