---
'@ixirjs/pulse': minor
---

**Breaking:** trimmed duplicated and internal API off the public surface.

- `flipFromRect`, `flipToRect`, `captureRect`, and the `AnimateFlipRect` type are gone from `@ixirjs/pulse/animate`. They duplicated `flipFrom` / `snapshotRect` in `@ixirjs/pulse/flip`, which carry the richer option set (opacity crossfade, `disablePointerEvents`, distance-derived duration, rect-carrying hooks). Migrate by importing those instead; pass `duration` / `easing` where you passed `AnimateDefaults`.
- `@ixirjs/pulse/flip` no longer exports the delta-math primitives `computeDelta`, `isIdentityDelta`, `diagonal`, `rectsEqual`, or the `FlipDelta` / `DeltaOptions` types. They are internals of the animator. `flip`, `flipFrom`, `snapshotRect`, `measure`, `animateFlip`, `createFlipScope`, `createFlipSwitcher`, `anchoredFlip`, and `createObserverManager` are unchanged.
- `flipTo` stays, as the mirror of `flipFrom`: it animates an element from its current position **to** a captured rect (forward FLIP). `animateFlip({ …, forward: true })` remains the low-level form.
- `@ixirjs/pulse/morph` no longer exports the path-alignment internals `planMorph`, `interpolatePlan`, `toPathString`, `subdivideTo`, `alignSubpaths`, `minimizeAnchorTravel`, `rotateClosed`, `reverseClosed`, or the `MorphPlan` type. `morph`, `parsePath`, and `normalizePath` are unchanged.

Internally, FLIP geometry now lives in one module (`flip/geometry.ts`) instead of being split across the `animate` and `flip` layers.
