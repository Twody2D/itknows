/** The only causes `Player.kill()` is ever called with. */
export type DeathCause = 'spike' | 'trap' | 'fall';

export interface GameEvents {
  'player:died': { cause: DeathCause; x: number; y: number };
  'player:landed': { x: number; y: number };
  'player:jumped': undefined;
  'level:loaded': { levelId: string };
  'level:completed': { levelId: string; timeMs: number; deaths: number };
  'level:restart': undefined;
  'trap:armed': { trapId: string };
  'trap:triggered': { trapId: string };
  'system:comment': { text: string; category: string };
}

type EventName = keyof GameEvents;

interface Listener {
  handler: (payload: never) => void;
  context: unknown;
}

/**
 * Minimal typed pub/sub shared across scenes and non-scene systems (AI,
 * audio, services) so they never reach into each other directly. A
 * self-contained implementation on purpose, not a wrapper around Phaser's
 * `EventEmitter` — `PlayerProfile`/`SystemMemory`/`Commentator`/tests all
 * need to import this without dragging in Phaser (which requires a `window`
 * global and can't load under Vitest's plain Node test environment,
 * CLAUDE.md #1 "тесты — только логика").
 */
class TypedEventBus {
  private listeners = new Map<EventName, Set<Listener>>();

  on<K extends EventName>(event: K, handler: (payload: GameEvents[K]) => void, context?: unknown): void {
    this.setFor(event).add({ handler: handler as Listener['handler'], context });
  }

  once<K extends EventName>(event: K, handler: (payload: GameEvents[K]) => void, context?: unknown): void {
    const wrapped = (payload: GameEvents[K]): void => {
      this.off(event, wrapped, context);
      handler.call(context, payload);
    };
    this.on(event, wrapped, context);
  }

  off<K extends EventName>(event: K, handler?: (payload: GameEvents[K]) => void, context?: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    if (!handler) {
      set.clear();
      return;
    }
    for (const entry of set) {
      if (entry.handler === (handler as Listener['handler']) && entry.context === context) set.delete(entry);
    }
  }

  emit<K extends EventName>(event: K, payload: GameEvents[K]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;
    for (const entry of [...set]) {
      (entry.handler as (payload: GameEvents[K]) => void).call(entry.context, payload);
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  private setFor(event: EventName): Set<Listener> {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    return set;
  }
}

export const EventBus = new TypedEventBus();
