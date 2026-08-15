# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-05-21

### Added

#### `animate(element, props, defaults?)`

- Spring-physics WAAPI animation runtime with per-property spring curves.
- Independent transform component animation (`x`, `y`, `scale`, `rotate`, `skewX`, `skewY`) via registered CSS custom properties — never clobbers sibling transforms.
- `[from, to]` shorthand, `PropConfig` full form, and bare-value (current → target) inputs.
- Per-prop `duration`, `easing`, `delay`, `spring` overrides.
- `AnimationController` with `play`, `pause`, `reverse`, `cancel`, `stop`, `seek`, `playbackRate`.
- `prefers-reduced-motion` support (skips animation and applies end-state).

#### `timeline(defaults?)`

- Sequence and parallelize `animate()` calls along a shared clock.
- Position grammar: absolute ms, `"+=N"`/`"-=N"`, `"<"`/`">"` anchors with offsets, named labels.
- `.add()`, `.set()`, `.call()`, `.label()` builder API (chainable).
- Full playback control: `play`, `pause`, `reverse`, `cancel`, `stop`, `seek`, `setPlaybackRate`.
- `finished` promise aggregating all child animations.

#### `spring(options?)`

- Simulate a spring from 0 → 1 and return per-frame samples + duration.
- Memoized by physics parameters (LRU cache, max 128 entries).
- Used internally by `animate()` spring props.

#### `springEasing(options?)`

- Returns a `SpringEasingFn` usable anywhere an `easing` is accepted.
- Carries `.duration` (natural settling time) and `._linearEasing` (pre-built WAAPI string).

#### `stagger(interval, options?)`

- Generate staggered delays for list animations.
- `from`: `'start'` | `'end'` | `'center'` | `number` (normalized 0–1 position).
- Optional `easing` for non-linear wave staggers.

#### `cubicBezier(x1, y1, x2, y2)`

- Build an easing function equivalent to CSS `cubic-bezier(x1, y1, x2, y2)`.
- Newton-Raphson root-finding with binary-subdivision fallback.

#### `easings` namespace

- `linear`, `ease`, `easeIn`, `easeOut`, `easeInOut`
- `quadIn/Out/InOut`, `cubicIn/Out/InOut`, `quartIn/Out/InOut`, `quintIn/Out/InOut`
- `expoIn/Out/InOut`, `sineIn/Out/InOut`, `circIn/Out/InOut`
- `backIn/Out/InOut`, `elasticIn/Out/InOut`, `bounceIn/Out/InOut`

#### `flip(options?)` (Svelte 5 attachment)

- Zero-config FLIP (First, Last, Invert, Play) layout-shift animator via `{@attach flip()}`.
- Reactive remeasure: pass a thunk `auto: () => { void open; }` to track rune dependencies.
- Auto-tracking via `ResizeObserver` + `MutationObserver` (`auto: createObserverManager()`).
- `skip` callback for selectively suppressing animation cycles.
- `disablePointerEvents` guard during animation.
- `prefers-reduced-motion` support.

#### `createFlipScope()`

- Shared-element cross-component transitions via `layoutId`.
- `flip` attachment factory bound to a shared layout registry.
- `layoutTtlMs` configurable TTL for stored rects.

#### `flipFrom(element, from, options?)`

- Imperatively animate an element from a captured rect to its current position.

#### `snapshotRect(element)`

- Capture an element's current rect for use with `flipFrom`.

[0.1.0]: https://github.com/ixirjs/pulse/releases/tag/v0.1.0
