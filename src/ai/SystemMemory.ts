/**
 * THE SYSTEM's short-term memory (master-prompt §69) — a handful of facts
 * about the last few attempts, not a history log. Drives comment selection
 * (Commentator). It used to drive variant selection too, until the adaptive
 * cuts of a level were removed (`LevelFactory`) — THE SYSTEM still watches,
 * it just no longer changes what it is watching.
 * Session-only, like `GameState`/`PlayerProfile` — see those for why.
 */
export interface SystemMemoryData {
  lastDeathType: 'spike' | 'trap' | 'fall' | null;
  /** Consecutive deaths on the *same level, same cause* — resets on any change. */
  repeatDeathCount: number;
  /** id of the trap involved in the most recent death, if any (null for spikes/falls). */
  recentTrap: string | null;
  /** Was the last clear the end of a losing streak? Feeds THE SYSTEM's "you got there" line, and nothing else reads it now that difficulty no longer adapts. */
  recentSuccessfulAdaptation: boolean;
  /** Consecutive level clears without a death, session-wide. */
  currentStreak: number;
}

class SystemMemoryStore {
  private data: SystemMemoryData = SystemMemoryStore.initial();
  private lastDeathLevelId: string | null = null;

  private static initial(): SystemMemoryData {
    return {
      lastDeathType: null,
      repeatDeathCount: 0,
      recentTrap: null,
      recentSuccessfulAdaptation: false,
      currentStreak: 0,
    };
  }

  snapshot(): Readonly<SystemMemoryData> {
    return this.data;
  }

  reset(): void {
    this.data = SystemMemoryStore.initial();
    this.lastDeathLevelId = null;
  }

  registerDeath(levelId: string, cause: 'spike' | 'trap' | 'fall', trapId: string | null): void {
    const isRepeat = this.lastDeathLevelId === levelId && this.data.lastDeathType === cause;
    this.data = {
      ...this.data,
      lastDeathType: cause,
      recentTrap: trapId,
      repeatDeathCount: isRepeat ? this.data.repeatDeathCount + 1 : 1,
      recentSuccessfulAdaptation: false,
      currentStreak: 0,
    };
    this.lastDeathLevelId = levelId;
  }

  /** @param wasStruggling true if this clear followed a repeat-death streak (i.e. an adaptation had a chance to help). */
  registerClear(_levelId: string, wasStruggling: boolean): void {
    this.data = {
      ...this.data,
      repeatDeathCount: 0,
      recentSuccessfulAdaptation: wasStruggling,
      currentStreak: this.data.currentStreak + 1,
    };
    this.lastDeathLevelId = null;
  }
}

export const SystemMemory = new SystemMemoryStore();
