import Phaser from 'phaser';

export interface GameEvents {
  'player:died': { cause: string; x: number; y: number };
  'player:landed': { x: number; y: number };
  'player:jumped': undefined;
  'level:loaded': { levelId: string; variantId: string };
  'level:completed': { levelId: string; timeMs: number; deaths: number };
  'level:restart': undefined;
  'trap:armed': { trapId: string };
  'trap:triggered': { trapId: string };
  'system:comment': { text: string; category: string };
}

type EventName = keyof GameEvents;

/**
 * Thin typed wrapper around Phaser's EventEmitter shared across scenes and
 * non-scene systems (AI, audio, services) so they never reach into each
 * other directly.
 */
class TypedEventBus {
  private emitter = new Phaser.Events.EventEmitter();

  on<K extends EventName>(event: K, handler: (payload: GameEvents[K]) => void, context?: unknown): void {
    this.emitter.on(event, handler, context);
  }

  once<K extends EventName>(event: K, handler: (payload: GameEvents[K]) => void, context?: unknown): void {
    this.emitter.once(event, handler, context);
  }

  off<K extends EventName>(event: K, handler?: (payload: GameEvents[K]) => void, context?: unknown): void {
    this.emitter.off(event, handler, context);
  }

  emit<K extends EventName>(event: K, payload: GameEvents[K]): void {
    this.emitter.emit(event, payload);
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const EventBus = new TypedEventBus();
