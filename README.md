# @ixirjs/pulse

Spring-powered WAAPI animation utilities and FLIP layout transitions for Svelte 5.

- **`animate()`** — Animate any CSS property with spring physics, per-prop overrides, and a full playback API.
- **`flip()`** — Zero-config FLIP layout transitions as a Svelte 5 attachment.
- **`timeline()`** — Sequence and parallelize animations along a shared clock.
- **`stagger()`** — Generate staggered delays for list animations.
- **`spring()` / `springEasing()`** — Spring physics primitives you can use anywhere.
- **30+ built-in easings** — CSS equivalents plus cubic-bezier factory.
- **Honors `prefers-reduced-motion`** by default.

## Installation

```sh
npm install @ixirjs/pulse
```

Svelte 5 is a required peer dependency:

```sh
npm install svelte@^5
```

## `animate(element, props, defaults?)`

Animate one or more CSS properties on an element using the Web Animations API.

```ts
import { animate } from '@ixirjs/pulse';

// Bare value: current → target
animate(el, { opacity: 1 });

// [from, to] shorthand
animate(el, { opacity: [0, 1], y: [20, 0] });

// Full PropConfig
animate(el, {
  x: { from: -100, to: 0, duration: 400, easing: easeOut },
  scale: { to: 1.05, spring: { stiffness: 300, damping: 20 } },
});

// Shared defaults
animate(el, { x: 100, opacity: 1 }, { duration: 300, easing: cubicOut });
```

### `animate()` defaults

| Option | Type | Default |
|---|---|---|
| `duration` | `number` | `300` |
| `easing` | `EasingFn` | cubic ease-out |
| `spring` | `SpringInput` | — |
| `delay` | `number` | `0` |
| `fill` | `FillMode` | `'both'` |
| `iterations` | `number` | `1` |
| `direction` | `PlaybackDirection` | `'normal'` |
| `respectReducedMotion` | `boolean` | `true` |
| `onStart` | `(el) => void` | — |
| `onEnd` | `(el, { finished }) => void` | — |

### `AnimationController`

```ts
const ctrl = animate(el, { x: 100 });

ctrl.play();
ctrl.pause();
ctrl.reverse();
ctrl.cancel();    // cancel + snap back
ctrl.stop();      // commit current position + cancel
ctrl.seek(150);   // seek to 150ms
ctrl.playbackRate = 2; // 2× speed

await ctrl.finished; // resolves when done
```

### Transform shorthands

The following shorthands animate independent transform components without clobbering each other:

| Key | CSS custom property |
|---|---|
| `x` | `--motion-x` (px) |
| `y` | `--motion-y` (px) |
| `scale` | `--motion-scale` |
| `scaleX` | `--motion-scale-x` |
| `scaleY` | `--motion-scale-y` |
| `rotate` | `--motion-rotate` (deg) |
| `skewX` | `--motion-skew-x` (deg) |
| `skewY` | `--motion-skew-y` (deg) |

## `flip(options?)` — Svelte 5 attachment

Zero-config FLIP layout animation. Attach to any element that may shift position or size.

```svelte
<script>
  import { flip } from '@ixirjs/pulse';
  let open = $state(false);
</script>

<!-- Auto-animates whenever the element moves -->
<div {@attach flip()}>...</div>

<!-- Custom duration + easing -->
<div {@attach flip({ duration: 320, easing: cubicOut })}>...</div>

<!-- Reactive: re-measures whenever `open` changes -->
<div {@attach flip({ auto: () => { void open; } })}>...</div>

<!-- Skip the first render (mount) -->
<div {@attach flip({ skip: (n) => n === 0 })}>...</div>
```

### Flip options

| Option | Type | Default |
|---|---|---|
| `duration` | `number \| (distance, rects) => number` | `280` |
| `easing` | `EasingFn \| string` | `cubicOut` |
| `delay` | `number` | `0` |
| `translate` | `boolean` | `true` |
| `scale` | `boolean` | `true` |
| `opacity` | `boolean \| { from?, to? }` | — |
| `auto` | `false \| (() => void) \| ObserverManager` | — |
| `skip` | `boolean \| (render, rects) => boolean` | — |
| `disablePointerEvents` | `boolean` | — |
| `respectReducedMotion` | `boolean` | `true` |
| `layoutId` | `string` | — |
| `onStart` | `(el, rects) => void` | — |
| `onEnd` | `(el, { finished, rects }) => void` | — |

### Shared-element transitions (`createFlipScope`)

```svelte
<script>
  import { createFlipScope } from '@ixirjs/pulse';
  const scope = createFlipScope();
</script>

<!-- Component A (unmounting) -->
<div {@attach scope.flip({ layoutId: 'hero' })}>...</div>

<!-- Component B (mounting) — animates FROM A's last position -->
<div {@attach scope.flip({ layoutId: 'hero' })}>...</div>
```

### Imperative flip

```ts
import { snapshotRect, flipFrom } from '@ixirjs/pulse';

const snapshot = snapshotRect(el);
// ... DOM changes ...
flipFrom(el, snapshot, { duration: 300 });
```

## `timeline(defaults?)`

Sequence and parallelize `animate()` calls on a shared clock.

```ts
import { timeline } from '@ixirjs/pulse';

timeline({ duration: 400 })
  .add(card,    { y: [20, 0], opacity: [0, 1] })
  .add(title,   { y: [10, 0], opacity: [0, 1] }, undefined, '<+50')
  .label('reveal')
  .add(actions, { opacity: [0, 1] }, undefined, 'reveal+=100')
  .call(() => console.log('done'), '>+50')
  .play();
```

### Position grammar

| Syntax | Meaning |
|---|---|
| `undefined` | Append at current end |
| `123` | Absolute time in ms |
| `"+=200"`, `"-=100"` | Offset from current end |
| `">"`, `">+200"` | End of last child ± offset |
| `"<"`, `"<+200"` | Start of last child ± offset |
| `"label"`, `"label+=200"` | Named label ± offset |

## `stagger(interval, options?)`

```ts
import { animate, stagger } from '@ixirjs/pulse';

const delay = stagger(50);
items.forEach((el, i) => {
  animate(el, { opacity: [0, 1], y: [20, 0] }, { delay: delay(i, items.length) });
});

// Center-out wave
const wave = stagger(40, { from: 'center' });

// With easing
const eased = stagger(60, { from: 'start', easing: easeOut });
```

## `spring(options?)`

Simulate spring physics from 0 → 1 and return per-frame samples + duration:

```ts
import { spring } from '@ixirjs/pulse';

const { samples, duration } = spring({ stiffness: 200, damping: 20 });
```

| Option | Default |
|---|---|
| `stiffness` | `170` |
| `damping` | `26` |
| `mass` | `1` |
| `velocity` | `0` |
| `restDelta` | `0.001` |
| `restSpeed` | `0.001` |

## `springEasing(options?)`

Returns an `EasingFn` usable anywhere `easing` is accepted:

```ts
import { animate, springEasing } from '@ixirjs/pulse';

const bouncy = springEasing({ stiffness: 300, damping: 18 });

// Duration auto-sized from the spring simulation:
animate(el, { scale: 1.2 }, { easing: bouncy });
```

## Easings

Import individually or via the `easings` namespace:

```ts
import { cubicOut, backOut, elasticOut, cubicBezier } from '@ixirjs/pulse';
import * as easings from '@ixirjs/pulse';

const snappy = cubicBezier(0.2, 0.9, 0.2, 1);
```

Available: `linear`, `ease`, `easeIn`, `easeOut`, `easeInOut`, `quadIn/Out/InOut`, `cubicIn/Out/InOut`, `quartIn/Out/InOut`, `quintIn/Out/InOut`, `expoIn/Out/InOut`, `sineIn/Out/InOut`, `circIn/Out/InOut`, `backIn/Out/InOut`, `elasticIn/Out/InOut`, `bounceIn/Out/InOut`.

## Subpath imports

For better tree-shaking you can import directly from subpaths:

```ts
import { animate, timeline, spring } from '@ixirjs/pulse/animate';
import { flip, createFlipScope, flipFrom } from '@ixirjs/pulse/flip';
```

## Contributing

```sh
git clone https://github.com/ixirjs/pulse
cd pulse
npm install
npm run dev      # start demo app
npm test         # run tests
npm run check    # type-check
npm run lint     # lint + format check
```

## License

[MIT](./LICENSE)

