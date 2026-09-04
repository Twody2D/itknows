/**
 * Facade for the Yandex Games SDK (CLAUDE.md #8 — gameplay/UI code never
 * touches `ysdk` directly). API verified against the real docs — see
 * `docs/yandex-games.md` for the sources and what's still deferred (auth,
 * player data, leaderboards).
 *
 * Loads `https://yandex.ru/games/sdk/v2` (the one CDN script CLAUDE.md #1
 * allows outside pnpm dependencies) and calls `YaGames.init()`. Every method
 * below degrades to a silent no-op if that ever fails — missing script,
 * blocked network, an SDK error, or simply not running inside Yandex Games
 * (local dev, tests) — so the rest of the game never needs its own "is the
 * SDK there" branch (same contract as `SaveService`/`AudioSettings`).
 */

interface YsdkAdvCallbacks {
  onOpen?: () => void;
  onClose?: (wasShown: boolean) => void;
  onError?: (error: unknown) => void;
}

interface YsdkRewardedCallbacks extends YsdkAdvCallbacks {
  onRewarded?: () => void;
}

interface YsdkPlayer {
  isAuthorized(): boolean;
  getData(keys?: string[]): Promise<Record<string, unknown>>;
  setData(data: Record<string, unknown>, flush?: boolean): Promise<void>;
}

interface Ysdk {
  features?: {
    LoadingAPI?: { ready(): void };
    GameplayAPI?: { start(): void; stop(): void };
  };
  adv?: {
    showFullscreenAdv(options?: { callbacks?: YsdkAdvCallbacks }): void;
    showRewardedVideo(options?: { callbacks?: YsdkRewardedCallbacks }): void;
  };
  getPlayer?(options?: { scopes?: boolean }): Promise<YsdkPlayer>;
}

interface YaGamesGlobal {
  init(): Promise<Ysdk>;
}

declare global {
  interface Window {
    YaGames?: YaGamesGlobal;
  }
}

const SDK_SCRIPT_URL = 'https://yandex.ru/games/sdk/v2';

class YandexGamesServiceController {
  private ysdk: Ysdk | null = null;
  private initPromise: Promise<void> | null = null;
  private menuInteractive = false;
  private loadingReadyNotified = false;
  private player: YsdkPlayer | null = null;
  private playerPromise: Promise<YsdkPlayer | null> | null = null;

  /** Call once, as early as possible (`main.ts`) — never blocks game creation, the network can be slower than boot. */
  init(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.loadAndInit();
    return this.initPromise;
  }

  isAvailable(): boolean {
    return this.ysdk !== null;
  }

  /**
   * `LoadingAPI.ready()` fires once, the first time the menu is actually
   * interactive — not on every menu visit. Safe to call from
   * `MainMenuScene.create()` every time; only the first call (post-`init()`)
   * reaches the SDK. If `init()` hasn't resolved yet when the menu is ready
   * (the common case — network is slower than rendering the boot scene),
   * the intent is remembered and flushed once `init()` does resolve, instead
   * of silently never firing.
   */
  notifyLoadingReady(): void {
    this.menuInteractive = true;
    this.flushLoadingReady();
  }

  /** `GameplayAPI.start()` — call whenever a real attempt begins/resumes (level start, restart-after-death, unpause). Menu/pause never call this. */
  notifyGameplayStart(): void {
    this.ysdk?.features?.GameplayAPI?.start();
  }

  /** `GameplayAPI.stop()` — call whenever gameplay pauses/ends (death-restart teardown, pause, leaving the scene). */
  notifyGameplayStop(): void {
    this.ysdk?.features?.GameplayAPI?.stop();
  }

  showInterstitial(): Promise<void> {
    const adv = this.ysdk?.adv;
    if (!adv) return Promise.resolve();
    return new Promise((resolve) => {
      adv.showFullscreenAdv({
        callbacks: {
          onClose: () => resolve(),
          onError: () => resolve(),
        },
      });
    });
  }

  showRewarded(onComplete: (granted: boolean) => void): void {
    const adv = this.ysdk?.adv;
    if (!adv) {
      onComplete(false);
      return;
    }
    let rewarded = false;
    adv.showRewardedVideo({
      callbacks: {
        onRewarded: () => {
          rewarded = true;
        },
        onClose: () => onComplete(rewarded),
        onError: () => onComplete(false),
      },
    });
  }

  /**
   * Cloud save storage (`player.getData`/`setData`) only actually persists
   * for authorized players — a guest gets no server-side storage at all
   * (confirmed against the docs, `docs/yandex-games.md`), so `SaveService`'s
   * localStorage stays the only source of truth for guests, exactly as
   * CLAUDE.md #8 already requires regardless of the SDK. `{ scopes: false }`
   * on `getPlayer()` skips the name/avatar permission dialog entirely — this
   * only ever needs the player's identity and authorized status, nothing
   * user-facing. Returns `null` for "no cloud storage available right now"
   * (guest, SDK unavailable, or the call itself failed) — callers don't need
   * to distinguish why.
   */
  async getPlayerData(keys?: string[]): Promise<Record<string, unknown> | null> {
    const player = await this.getPlayer();
    if (!player?.isAuthorized()) return null;
    try {
      return await player.getData(keys);
    } catch {
      return null;
    }
  }

  /** Best-effort — silently does nothing without an authorized player, same reasoning as `getPlayerData`. */
  async setPlayerData(data: Record<string, unknown>): Promise<void> {
    const player = await this.getPlayer();
    if (!player?.isAuthorized()) return;
    try {
      await player.setData(data, true);
    } catch {
      /* best-effort — a failed cloud push never breaks the local save */
    }
  }

  /** Test/dev-only reset — never called from gameplay code. */
  resetForTests(): void {
    this.ysdk = null;
    this.initPromise = null;
    this.menuInteractive = false;
    this.loadingReadyNotified = false;
    this.player = null;
    this.playerPromise = null;
  }

  /** `ysdk.getPlayer()` is rate-limited (20 requests/5 minutes) — resolved once and cached, never re-requested per call. */
  private async getPlayer(): Promise<YsdkPlayer | null> {
    if (this.player) return this.player;
    if (!this.ysdk?.getPlayer) return null;
    if (!this.playerPromise) {
      this.playerPromise = this.ysdk.getPlayer({ scopes: false }).catch(() => null);
    }
    this.player = await this.playerPromise;
    return this.player;
  }

  private flushLoadingReady(): void {
    if (!this.menuInteractive || this.loadingReadyNotified || !this.ysdk) return;
    this.loadingReadyNotified = true;
    this.ysdk.features?.LoadingAPI?.ready();
  }

  private async loadAndInit(): Promise<void> {
    try {
      // Real Yandex Games hosting always embeds the game in an iframe; the
      // SDK's own postMessage-based plumbing to that parent frame is what
      // most of its features (GameplayAPI included) actually rely on.
      // Discovered live: outside an iframe (any standalone hosting —
      // `pnpm dev`, a bare static server, this game opened directly) the SDK
      // still loads and `init()` still resolves, but individual feature
      // calls throw ("No parent to post message") as unhandled promise
      // rejections we have no synchronous call to catch. Treating "not
      // embedded" as "no SDK" up front avoids ever making those calls,
      // which is also just an honest read of the situation — the SDK isn't
      // meaningfully present if there's no real host on the other end.
      if (window.self === window.top) return;
      await this.loadScript();
      if (!window.YaGames) return;
      this.ysdk = await window.YaGames.init();
      this.flushLoadingReady();
    } catch {
      this.ysdk = null;
    }
  }

  private loadScript(): Promise<void> {
    if (window.YaGames) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Yandex Games SDK script failed to load'));
      document.head.appendChild(script);
    });
  }
}

export const YandexGamesService = new YandexGamesServiceController();
