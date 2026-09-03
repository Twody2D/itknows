/**
 * Session-only FX toggles. Mutable module state on purpose — `FxManager`
 * reads these live on every call, and the not-yet-built Settings screen
 * (Phase 4) only has to flip these fields, not reach into every scene.
 */
export const FxSettings = {
  particlesEnabled: true,
  shakeEnabled: true,
};
