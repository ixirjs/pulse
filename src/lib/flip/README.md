# flip

FLIP (**F**irst, **L**ast, **I**nvert, **P**lay) layout animations for Svelte 5. Animate elements smoothly between layout positions using inverse transforms — no manual measuring, delivered as a Svelte 5 `{@attach}` attachment.

- **Zero-config** — `{@attach flip()}` animates any layout shift the element undergoes.
- **Auto-tracking** — a `ResizeObserver` on the element plus a `MutationObserver` on its parent detect reflows automatically.
- **Shared-element transitions** — opt in with `createFlipScope()` + `layoutId` to hand off between an unmounting and a mounting element.
- **Reduced-motion aware** and **pointer-safe** during animation.

## Quick start

```svelte
<script>
  import { flip } from '$lib/flip';
</script>

<!-- Animate whenever this element's layout changes -->
<div {@attach flip()}>content</div>

<!-- Remeasure when a rune dependency changes -->
<div {@attach flip({ auto: () => { void open; } })}>content</div>

<!-- Skip the first render (common on mount) -->
<div {@attach flip({ skip: (n) => n === 0 })}>content</div>
```

## Public API

| Export | Signature | Purpose |
| --- | --- | --- |
| `flip` | `(options?) => Attachment` | Svelte 5 attachment with automatic layout tracking. |
| `flipFrom` | `(element, from, options?) => AnimationController \| null` | Inverse FLIP: animate from a captured rect to current position. |
| `flipTo` | `(element, to, options?) => AnimationController \| null` | Forward FLIP: animate current position toward a target rect (e.g. on exit). |
| `snapshotRect` | `(element) => FlipRect` | Capture an element's current rect. |
| `createFlipScope` | `(opts?) => { flip, clear }` | Isolated shared-layout registry with a scoped `flip()`. |
| `createFlipSwitcher` | `(resolver, options?) => { source, target }` | Animate transitions between two elements based on a reactive role. |

Lower-level building blocks (`animateFlip`, `createFlipAttachment`, `createLayoutBridge`, `createObserverManager`, `createReflowScheduler`, and the geometry helpers) are also re-exported.

### Key options (`FlipOptions`)

`duration` (ms or `(distance, rects) => ms`), `easing`, `delay`, `translate` / `scale` (default `true`), `opacity` (`true` → crossfade), `layoutId`, `auto`, `disabled`, `skip`, `disablePointerEvents`, `respectReducedMotion` (default `true`), `composite`, and `onStart` / `onEnd` hooks.

## Shared-element transitions

```ts
const scope = createFlipScope();
```

```svelte
<!-- Component A -->
<div {@attach scope.flip({ layoutId: 'hero' })}>Card</div>

<!-- Component B, after A unmounts -->
<div {@attach scope.flip({ layoutId: 'hero' })}>Card</div>
<!-- → plays FLIP from A's last-known rect to B's current position -->
```

A `LayoutBridge` stores each `layoutId`'s last rect with a short TTL (default 250 ms), enabling the handoff.

## Switching between two elements

```ts
const switcher = createFlipSwitcher(() => (tab === 'a' ? 'source' : 'target'));
```

```svelte
<div {@attach switcher.source}>Panel A</div>
<div {@attach switcher.target}>Panel B</div>
```

`$effect.pre` snapshots pre-update rects, then plays FLIP on the newly-active panel when the role changes.

## Manual FLIP

```ts
const rect = snapshotRect(element);
// ...move element in the DOM...
flipFrom(element, rect, { duration: 250 });
```

## Internal structure

| Submodule | Responsibility |
| --- | --- |
| `animation/` | `animateFlip()` core animator (delta + transform-origin compensation), cancellation, and a single-slot controller holder. |
| `integration/` | Svelte wiring — the attachment (`$effect`-driven reflow detection), the shared-layout `bridge`, the `scope` factory, and the element `switcher`. |
| `tracking/` | `ResizeObserver` + `MutationObserver` layout observers, an observer manager, and a RAF-batched reflow scheduler. |
| `geometry.ts` | `measure`, `rectsEqual`, `diagonal`, and delta math (`computeDelta`, `isIdentityDelta`, `resolveFlipDelta`). |
| `options.ts` | Parse/resolve options (duration, opacity, easing) and unwrap reactive thunks. |

> Built on the [`$lib/animate`](../animate/README.md) runtime via `--motion-*` custom properties, so a `flip()` and a sibling `animate()` on the same element compose without overwriting each other's transform.
