import Phaser from 'phaser';

export interface RelayoutHandle {
  /** Runs a rebuild that was deferred while the screen was covered. No-op if none is pending. */
  flush(): void;
}

/**
 * Rebuilds a menu/overlay scene whenever the virtual canvas width changes.
 *
 * The game keeps a fixed virtual height and a width that floats with the
 * device aspect ratio (CLAUDE.md #2), and `ScaleController` resizes the
 * canvas on every window resize and orientation change. Menu screens,
 * though, measure that width once in `create()` and place every panel from
 * it — so until this was wired up, resizing the window left each screen laid
 * out for the width it happened to open at: panels ended up in the wrong
 * place or off the edge entirely, while the DOM text layer, which does track
 * the canvas rect, carried on scaling correctly and so appeared to be set in
 * a different size from the boxes around it.
 *
 * Restarting is the right rebuild here rather than a targeted reflow: these
 * scenes derive every coordinate from the width at build time, a resize is a
 * rare and already-disruptive event, and instance fields survive a restart,
 * so a screen comes back on the same category or tab the player left it on.
 * Gameplay deliberately does not use this — a level must never restart under
 * the player — and it does not need to: its camera simply reveals more of the
 * world, which is the whole point of the floating width.
 *
 * `defer` exists for a screen that is currently covered by an overlay it
 * launched itself. The menu, for one, hides its own DOM layer and disables
 * its input for as long as the shop sits on top, and restores both from a
 * closure over the objects it held at that moment — rebuilding underneath
 * would strand that closure on destroyed objects and pop the menu's text up
 * through the screen above it. Such a scene defers instead, and calls
 * `flush()` once it is uncovered.
 */
export function rebuildOnResize(
  scene: Phaser.Scene,
  data?: object,
  defer?: () => boolean,
): RelayoutHandle {
  let lastWidth = scene.scale.width;
  let pending = false;

  // `ScenePlugin.restart` queues the restart for the next step rather than
  // tearing the scene down inside the resize event it was called from.
  const rebuild = (): void => {
    scene.scene.restart(data);
  };

  const onResize = (): void => {
    if (scene.scale.width === lastWidth) return;
    lastWidth = scene.scale.width;
    if (defer?.() === true) pending = true;
    else rebuild();
  };

  scene.scale.on(Phaser.Scale.Events.RESIZE, onResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, onResize));

  return {
    flush: () => {
      if (!pending) return;
      pending = false;
      rebuild();
    },
  };
}
