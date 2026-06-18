# easing

Easing functions for animation timing. Every easing is a pure `EasingFn` — `(t: number) => number` mapping normalized time `t ∈ [0, 1]` to normalized progress (typically `[0, 1]`, may overshoot for `back`/`elastic`). Pass one to `animate()` as the `easing` option, or as a per-property override.

## Quick start

```ts
import { easeInOut, cubicBezier, springEasing } from '$lib/easing';
import { animate } from '$lib/animate';

animate(node, { x: 100 }, { easing: easeInOut });

const swoop = cubicBezier(0.22, 1, 0.36, 1);
animate(node, { x: 100 }, { easing: swoop });
```

## What's here

| File | Provides |
| --- | --- |
| `primitive.ts` | 20+ preset curves across families: power (`quad`/`cubic`/`quart`/`quint` × `In`/`Out`/`InOut`), `expo*`, `sine*`, `circ*`, `back*` (overshoot), `elastic*`, `bounce*`, and `linear`. Plus helpers `pow(n)`, `powOut(n)`, `powInOut(n)`. |
| `cubic-bezier.ts` | `cubicBezier(x1, y1, x2, y2)` — build an easing from CSS control points, solved with Newton-Raphson (matches Blink/WebKit). |
| `css.ts` | The CSS keyword curves `ease`, `easeIn`, `easeOut`, `easeInOut`, and the `CSS_EASINGS` keyword lookup. |
| `spring.ts` | `springEasing(options?)` — a physics-driven easing that auto-sizes its own duration. |

## Spring easing

`springEasing` returns a `SpringEasingFn`: a callable easing that also carries a `duration` (natural settling time in ms). When no explicit duration is given, the spring sizes itself; passing one stretches/compresses the curve.

```ts
const bouncy = springEasing({ stiffness: 300, damping: 18 });

animate(node, { scale: 1.2 }, { easing: bouncy });               // auto-sized duration
animate(node, { scale: 1.2 }, { easing: bouncy, duration: 500 }); // stretched

// Mix per-property:
animate(node, {
  x: { to: 100, easing: bouncy },
  opacity: [0, 1],
});
```

Use `isSpringEasing(fn)` to type-guard a spring easing. The underlying simulation lives in [`$lib/shared`](../shared/README.md) (`spring-core.ts`) and is cached.
