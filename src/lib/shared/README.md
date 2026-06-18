# shared

Internal infrastructure shared across the library — core types, browser/accessibility detection, math helpers, and the spring physics engine. Nothing here is end-user-facing; it exists so [`animate`](../animate/README.md), [`flip`](../flip/README.md), and [`easing`](../easing/README.md) can share primitives without circular imports.

## What's here

| File | Provides |
| --- | --- |
| `types.ts` | `EasingFn` (`(t) => number`), `MotionElement` (`HTMLElement \| SVGElement`), and `SpringOptions` (`stiffness`, `damping`, `mass`, `velocity`, `restDelta`, `restSpeed`). |
| `browser.ts` | `isBrowser()`, `prefersReducedMotion()` (cached media-query check), and `shouldReduceMotion(respectFlag?)`. |
| `math.ts` | `atLeast0(n)` → `max(0, n)` and `clamp01(n)` → clamp to `[0, 1]`. |
| `spring-core.ts` | The spring simulation engine and WAAPI easing-string helpers. |

## Spring core

`spring-core.ts` simulates a mass-spring-damper system at 60 fps and caches the result (128-entry LRU keyed by the canonical options string), so repeated `springEasing(...)` calls with the same parameters never re-simulate.

```ts
import { getCachedSpring, sampleAt, samplesToLinearEasing } from '$lib/shared/spring-core';

const { spring, linearEasingCss } = getCachedSpring({ stiffness: 200, damping: 20 });
// spring.samples: number[]  spring.duration: ms
// linearEasingCss: "linear(0.00000, 0.20000, …, 1.00000)" for WAAPI
```

| Export | Purpose |
| --- | --- |
| `getCachedSpring(options?)` | Simulate (or fetch cached) `{ spring: { samples, duration }, linearEasingCss }`. |
| `sampleAt(samples, t)` | Linear-interpolate normalized progress at fractional `t ∈ [0, 1]`. |
| `samplesToLinearEasing(samples)` | Convert a sample array to a WAAPI `linear(...)` easing string. |

**Physics** — each frame (`dt = 1000/60` ms): `accel = (-stiffness·pos − damping·vel) / mass`, then integrate velocity and position. Terminates once position and velocity stay under their rest thresholds for 3 frames, capped at 10 s. Defaults: `stiffness 170`, `damping 26`, `mass 1`.
