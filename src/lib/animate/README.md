# `animate()`

A tiny WAAPI animation runtime with spring physics, independent transform components, and full TypeScript types.

## Table of contents

- [`animate()`](#animate)
  - [Table of contents](#table-of-contents)
  - [Basic usage](#basic-usage)
  - [Property shorthands](#property-shorthands)
  - [Animatable properties](#animatable-properties)
  - [Defaults](#defaults)
  - [Spring animations](#spring-animations)
    - [Per-prop `spring:`](#per-prop-spring)
    - [`springEasing()`](#springeasing)
    - [Choosing between them](#choosing-between-them)
      - [Spring physics parameters](#spring-physics-parameters)
  - [Easings](#easings)
  - [The `AnimationController`](#the-animationcontroller)
  - [Lifecycle callbacks](#lifecycle-callbacks)
  - [Reduced motion](#reduced-motion)
  - [Intrinsic-size keywords](#intrinsic-size-keywords)
  - [Independent transform components](#independent-transform-components)
  - [Timelines](#timelines)
    - [Position grammar](#position-grammar)
    - [`set` and `call`](#set-and-call)
    - [Labels](#labels)
    - [Playback control](#playback-control)
  - [API reference](#api-reference)
    - [`animate(element, props, defaults?)`](#animateelement-props-defaults)
    - [`spring(options?)`](#springoptions)
    - [`springEasing(options?)`](#springeasingoptions)
    - [`cubicBezier(x1, y1, x2, y2)`](#cubicbezierx1-y1-x2-y2)
    - [`timeline(defaults?)`](#timelinedefaults)

---

## Basic usage

```ts
import { animate } from './index';

animate(element, { opacity: 1, x: 100 });
```

`animate(element, props, defaults?)` returns an [`AnimationController`](#the-animationcontroller).

---

## Property shorthands

Each property in `props` accepts one of three forms:

```ts
// 1. Scalar — animate from the current computed value to the target.
animate(el, { opacity: 1 });
animate(el, { x: 120 });               // unitless → appends default unit (px)

// 2. Tuple — explicit [from, to].
animate(el, { opacity: [0, 1] });
animate(el, { width: ['100px', '300px'] });

// 3. Full PropConfig — all options available.
animate(el, {
  x: { from: 0, to: 200, duration: 600, easing: easeInOut, delay: 100 },
});
```

---

## Animatable properties

The following named properties are understood directly. Unknown camelCase keys
are converted to kebab-case and treated as plain CSS properties.

| Key | CSS property | Default unit |
|---|---|---|
| `x` | `--motion-x` (translate X) | `px` |
| `y` | `--motion-y` (translate Y) | `px` |
| `z` | `--motion-z` (translate Z) | `px` |
| `scale` | `--motion-scale` | — |
| `scaleX` | `--motion-scale-x` | — |
| `scaleY` | `--motion-scale-y` | — |
| `rotate` | `--motion-rotate` | `deg` |
| `opacity` | `opacity` | — |
| `width` | `width` | `px` |
| `height` | `height` | `px` |
| `top / left / right / bottom` | position props | `px` |
| `margin / padding` | box model | `px` |
| `fontSize` | `font-size` | `px` |
| `borderRadius` | `border-radius` | `px` |
| `color / backgroundColor / borderColor` | color | — |

Any other key is treated as a raw CSS property:

```ts
animate(el, { '--my-var': [0, 1], lineHeight: ['1', '1.6'] });
```

---

## Defaults

The third argument sets fallback values for every prop in the call.

```ts
animate(el, { x: 100, opacity: 1 }, {
  duration: 400,          // ms. Default: 300.
  easing: easeOut,        // any EasingFn. Default: ease-out cubic.
  spring: true,           // use spring physics for all props.
  delay: 50,              // ms. Default: 0.
  fill: 'forwards',       // WAAPI fill. Default: 'both'.
  composite: 'add',       // WAAPI composite. Default: 'replace'.
  respectReducedMotion: false,
  onStart: (el) => { ... },
  onEnd: (el, { finished }) => { ... },
});
```

Per-prop values always win over defaults.

---

## Spring animations

Springs are driven by a physics simulation (Euler integration at 60 fps from
`0 → 1`). They produce a `linear(…)` WAAPI easing at full simulation fidelity.

### Per-prop `spring:`

Set `spring` on any individual prop (or in defaults to apply to all props).
The duration is **auto-sized** from the simulation — no manual duration needed.

```ts
// Single prop:
animate(el, {
  scale: { to: 1.2, spring: { stiffness: 220, damping: 18 } },
});

// true = use all defaults (stiffness 170, damping 26, mass 1):
animate(el, { x: 100, scale: 1.1 }, { spring: true });

// Mix spring and non-spring props:
animate(el, {
  x:       { to: 100, spring: { stiffness: 200, damping: 20 } },
  opacity: [0, 1],     // uses regular easing + default 300ms
});
```

You can still override the duration to stretch or compress the curve in time
while preserving its shape (overshoot ratio, settle character):

```ts
animate(el, { x: { to: 100, spring: true, duration: 800 } });
```

### `springEasing()`

`springEasing(options?)` returns a `SpringEasingFn` — a plain easing function
that can be stored, shared, and passed wherever `easing` is accepted, including
`defaults.easing`.

```ts
import { animate, springEasing } from './index';

const bouncy = springEasing({ stiffness: 300, damping: 18 });

// Duration auto-sized from simulation (same behaviour as `spring:`):
animate(el, { scale: 1.2 }, { easing: bouncy });

// Override duration:
animate(el, { scale: 1.2 }, { easing: bouncy, duration: 500 });

// As a shared default — all props follow the same spring curve:
animate(el, { x: 100, opacity: 1 }, { easing: bouncy });

// Per-prop, mixing with other easings:
animate(el, {
  x:       { to: 100, easing: bouncy },
  opacity: [0, 1],    // uses default easing
});
```

`SpringEasingFn` exposes one public property:

| Property | Type | Description |
|---|---|---|
| `duration` | `number` | Natural settling time in ms from the simulation. |

### Choosing between them

| | `spring:` per-prop | `springEasing()` |
|---|---|---|
| Duration auto-sized | ✓ | ✓ (when `duration` is omitted) |
| Reusable across calls | — | ✓ |
| Settable as `defaults.easing` | — | ✓ |
| Inline, no variable needed | ✓ | — |

#### Spring physics parameters

| Option | Default | Effect |
|---|---|---|
| `stiffness` | `170` | Higher → faster and snappier |
| `damping` | `26` | Lower → more overshoot/bounce |
| `mass` | `1` | Higher → slower, heavier feel |
| `velocity` | `0` | Initial velocity in target-units/s |
| `restDelta` | `0.001` | Position threshold to stop simulation |
| `restSpeed` | `0.001` | Velocity threshold to stop simulation |

---

## Easings

All easing functions have the signature `(t: number) => number` where `t ∈ [0, 1]`.
Functions may return values outside `[0, 1]` for overshooting curves.

```ts
import {
  linear,
  quadIn, quadOut, quadInOut,
  cubicIn, cubicOut, cubicInOut,
  quartIn, quartOut, quartInOut,
  quintIn, quintOut, quintInOut,
  expoIn, expoOut, expoInOut,
  sineIn, sineOut, sineInOut,
  circIn, circOut, circInOut,
  backIn, backOut, backInOut,
  elasticIn, elasticOut, elasticInOut,
  bounceIn, bounceOut, bounceInOut,
  ease, easeIn, easeOut, easeInOut,    // CSS keyword equivalents
  cubicBezier,                          // custom cubic-bezier factory
  springEasing,                         // spring physics factory
} from './easings';
```

**`cubicBezier(x1, y1, x2, y2)`** — matches CSS `cubic-bezier(…)` exactly,
including Newton-Raphson with binary-subdivision fallback:

```ts
const snappy = cubicBezier(0.2, 0.9, 0.2, 1);
animate(el, { x: 100 }, { easing: snappy });
```

You can define your own easing as any function:

```ts
const myEasing = (t: number) => t * t * (3 - 2 * t); // smoothstep
animate(el, { opacity: 1 }, { easing: myEasing });
```

---

## The `AnimationController`

```ts
const ctrl = animate(el, { x: 100 });

await ctrl.finished;   // resolves when every animation has settled

ctrl.pause();
ctrl.play();
ctrl.reverse();
ctrl.cancel();         // immediately stops all animations

// Access the raw WAAPI Animation objects:
ctrl.animations;       // readonly Animation[]
```

`ctrl.finished` resolves to `void` when all animations finish normally,
and rejects if any animation is cancelled externally.

---

## Lifecycle callbacks

```ts
animate(el, { x: 100 }, {
  onStart: (el) => {
    console.log('animation started on', el);
  },
  onEnd: (el, { finished }) => {
    // finished = false if animation was cancelled before completing
    console.log('done, finished normally:', finished);
  },
});
```

Both callbacks fire even when animations are skipped due to reduced-motion
preference — `onEnd` is called immediately with `{ finished: true }`.

---

## Reduced motion

By default, `animate()` respects `prefers-reduced-motion: reduce`. When
active, all keyframe animations are skipped and the final state is applied
immediately.

```ts
// Opt out for a specific call:
animate(el, { x: 100 }, { respectReducedMotion: false });
```

---

## Intrinsic-size keywords

`width` and `height` (and other `measurable` props) accept `auto`,
`fit-content`, `min-content`, and `max-content` as targets:

```ts
// Animate from current height to its natural auto height, then restore
// `height: auto` so the element remains responsive:
animate(el, { height: 'auto' });

// Explicit [from, to]:
animate(el, { height: ['0px', 'auto'] });
```

Internally, the keyword is measured (via a hidden layout pass), animated as a
concrete pixel value, then the keyword is re-applied inline once the animation
finishes so the element responds to content changes.

---

## Independent transform components

`x`, `y`, `z`, `scale`, `scaleX`, `scaleY`, and `rotate` each animate their
own registered CSS custom property (`--motion-x`, `--motion-scale`, …).
The element's `translate`, `scale`, and `rotate` CSS properties are wired to
read those variables.

This means you can run two separate `animate()` calls on the same element —
one for position and one for scale — and they will never clobber each other,
even with different durations, easings, or springs.

```ts
animate(el, { x: 100 }, { duration: 300 });
animate(el, { scale: 1.2 }, { spring: true });  // runs independently
```

---

## Timelines

`timeline()` sequences and parallelizes `animate()` calls along a shared
clock. Each entry is placed at a position; the timeline tracks a running
duration and the start/end of the most recent entry so subsequent entries
can be anchored relative to them.

```ts
import { timeline, easings } from './index';

timeline({ duration: 400, easing: easings.easeOut })
  .add(card,    { y: [20, 0], opacity: [0, 1] })
  .add(title,   { y: [10, 0], opacity: [0, 1] }, undefined, '<+50')
  .add(actions, { opacity: [0, 1] }, undefined, '+=100')
  .call(() => emit('opened'));
```

Timelines build lazily — the chain above just describes the schedule. They
auto-play on the next microtask (so chaining stays synchronous) unless you
pass `paused: true` to defer playback.

### Position grammar

The fourth argument to `add()` (and the second argument to `set` / `call` /
`label`) accepts:

| Position | Meaning |
|---|---|
| `undefined` | Append at the current end (same as `">"`). |
| `123` | Absolute time, in ms, from the timeline start. |
| `"+=200"`, `"-=100"` | Offset from the current end. |
| `">"`, `">+200"`, `">-50"` | End of the most recent entry, with optional offset. |
| `"<"`, `"<+200"`, `"<-50"` | Start of the most recent entry — useful for "fire alongside the previous". |
| `"label"`, `"label+=200"` | A previously-declared label, with optional offset. |

```ts
timeline()
  .add(a, { x: 100 })           // 0   → 300
  .add(b, { x: 100 }, undefined, '<')   // 0   → 300 (alongside a)
  .add(c, { opacity: 1 }, undefined, '>+100')  // 400 → 700
  .add(d, { opacity: 0 }, undefined, '+=200');  // 900 → 1200
```

### `set` and `call`

`set()` writes CSS values instantly at a position — handy for "reset frames"
between sequenced animations. `call()` fires a callback at a position.

```ts
timeline()
  .set(panel, { opacity: 0, y: 20 })       // immediate
  .add(panel, { opacity: 1, y: 0 })
  .call(() => focus(panel), '<+50');       // 50ms after the fade starts
```

> Callbacks and `set()` writes fire on their original schedule and are not
> rewound by `pause()` / `seek()`. Use them for side-effects, not for visual
> state that needs to survive scrubbing.

### Labels

```ts
const tl = timeline()
  .add(hero, { opacity: [0, 1] })
  .label('reveal')
  .add(cta,  { opacity: [0, 1] }, undefined, 'reveal+=200');

tl.labels.get('reveal'); // → 300
```

### Playback control

`Timeline` mirrors `AnimationController` and adds `seek()`:

```ts
const tl = timeline({ paused: true })
  .add(el, { x: 200 })
  .add(el, { opacity: 0 }, undefined, '+=100');

tl.duration;       // total ms
tl.play();
tl.pause();
tl.reverse();
tl.seek(150);
tl.cancel();

await tl.finished;
```

`tl.animations` returns every materialized WAAPI `Animation` if you need to
hook into them directly.

---

## API reference

### `animate(element, props, defaults?)`

| Argument | Type | Description |
|---|---|---|
| `element` | `HTMLElement \| SVGElement` | Target element |
| `props` | `AnimateProps` | Properties to animate |
| `defaults` | `AnimateDefaults` | Optional shared options |

Returns `AnimationController`.

### `spring(options?)`

Low-level simulator. Returns `{ samples: number[], duration: number }`.
Useful if you need the raw curve data (e.g. to drive a non-WAAPI renderer).

```ts
import { spring } from './index';
const { samples, duration } = spring({ stiffness: 200, damping: 20 });
```

### `springEasing(options?)`

Returns a `SpringEasingFn` — an `EasingFn` with a `.duration` property
carrying the simulation's natural settling time. See [springEasing()](#springeasing).

### `cubicBezier(x1, y1, x2, y2)`

Returns an `EasingFn` matching CSS `cubic-bezier(x1, y1, x2, y2)`.

### `timeline(defaults?)`

Returns a `Timeline` (see [Timelines](#timelines)). `defaults` extends
`AnimateDefaults` with one extra option:

| Option | Default | Description |
|---|---|---|
| `paused` | `false` | When `true`, the timeline does not auto-play; call `.play()` manually. |

All other options are forwarded as defaults to every `add()` entry; per-call
`options` and per-prop config still override them.
