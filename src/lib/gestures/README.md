# gestures

Pointer-gesture attachments for Svelte 5. Each is a plain `{@attach}` — no component wrapper — and composes with [`animate()`](../animate/README.md) on the same element through the shared `--motion-*` transform chain.

| File                 | Responsibility                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `draggable.ts`       | `draggable(options)` — pointer drag that writes `--motion-x` / `--motion-y` (so it never clobbers sibling animations). On release it hands the live pointer velocity to a [`SpringValue`](../animate/README.md), giving natural momentum and elastic snap-back. Supports axis lock, static or reactive `constraints`, rubber-band `elastic`, `snapToOrigin`, and start/move/end callbacks. |
| `move.ts`            | `moveable(options)` — tracks the pointer over the element (no button) and reports its position normalised from the centre (`nx` / `ny` in `-1…1`), for tilt, parallax and spotlight effects. Optionally applies a springy "magnetic" pull via `--motion-x` / `--motion-y`. Touch filtered out by default.                                                                                  |
| `swipe.ts`           | `swipeable(options)` — discrete directional fling. Tracks press travel and live velocity, then fires `onSwipe('left' \| 'right' \| 'up' \| 'down', info)` once a distance _or_ velocity threshold is cleared. Supports `axis` lock. For swipe-to-dismiss, card stacks and carousel paging.                                                                                                 |
| `hover.ts`           | `hoverable(options)` — `pointerenter` / `pointerleave` with touch "sticky hover" filtered out by default (`includeTouch` to opt in).                                                                                                                                                                                                                                                       |
| `focus.ts`           | `focusable(options)` — the keyboard counterpart of `hoverable`. Symmetric `onFocusStart` / `onFocusEnd` with `:focus-within` semantics (no flicker as focus moves between children), so hover motion has an accessible equivalent.                                                                                                                                                         |
| `press.ts`           | `pressable(options)` — press with native cancel semantics: a press that drifts off the element fires `onPressEnd(pressed=false)` and skips `onPress`. Also exposes `onLongPress` (held past `longPressDelay`, then suppresses the click) and `onDoubleTap`. Pointer capture tracks the same pointer throughout.                                                                            |
| `pinch.ts`           | `pinchable(options)` — two-pointer pinch-zoom + rotate. Tracks the distance/angle between two active pointers and reports live `scale` / `rotation`, optionally writing `--motion-scale` / `--motion-rotate` so it composes with `animate()`. Supports `scaleBounds`, `rotate: false`, and start/move/end callbacks.                                                                       |
| `wheel.ts`           | `wheelable(options)` — desktop wheel / trackpad zoom; the pointer-free counterpart of `pinchable`. Turns `wheel` deltas (incl. `ctrlKey` trackpad pinch) into a multiplicative `scale`, optionally writing `--motion-scale` (spring-smoothed by default so notched wheels ramp instead of snapping). Brackets discrete ticks into one gesture with `onStart` / `onEnd`.                                                                                            |
| `reorder.ts`         | `reorder({ items, onReorder })` — headless drag-to-reorder. Returns `{ item(value) }`: attach it to each row. The dragged row follows the pointer while siblings slide to open a slot; on drop the array is reordered via `onReorder(next)` and every row FLIPs into its new position. Composes [`draggable`](#) with the [FLIP engine](../flip/README.md).                                |
| `constraints.ts`     | Pure constraint math (`applyConstraint`, `xBounds`, `yBounds`) — clamping and elastic overflow, DOM-free and unit-tested.                                                                                                                                                                                                                                                                  |
| `pointer-capture.ts` | `capture` / `release` wrappers that swallow the `NotFoundError` thrown when a pointer id is no longer active.                                                                                                                                                                                                                                                                              |

```svelte
<script>
	import { draggable, hoverable, pressable } from '@svelte-atoms/vibra/gestures';
	import { animate } from '@svelte-atoms/vibra/animate';
</script>

<!-- Drag within bounds, springy rubber-band edges, momentum on release -->
<div
	{@attach draggable({ constraints: { left: -120, right: 120, top: 0, bottom: 0 }, elastic: 0.2 })}
/>

<!-- Hover/press feedback -->
<button
	{@attach hoverable({
		onHoverStart: (el) => animate(el, { scale: 1.05 }),
		onHoverEnd: (el) => animate(el, { scale: 1 })
	})}
	{@attach pressable({
		onPressStart: (el) => animate(el, { scale: 0.95 }),
		onPressEnd: (el) => animate(el, { scale: 1 }),
		onPress: submit
	})}>Save</button
>
```

### `draggable` options

| Option         | Default         | Effect                                                                    |
| -------------- | --------------- | ------------------------------------------------------------------------- |
| `axis`         | `'both'`        | Lock dragging to `'x'` or `'y'`. Sets `touch-action` accordingly.         |
| `constraints`  | —               | `{ left, right, top, bottom }` bounds, or a thunk re-read per drag.       |
| `elastic`      | `0`             | Resistance past constraints: `0` = wall, `1` = none, `0.2` = rubber-band. |
| `spring`       | spring defaults | Physics for release momentum and snap-back.                               |
| `snapToOrigin` | `false`         | Spring back to the start instead of staying put.                          |
| `momentum`     | `true`          | Carry release velocity into the settle spring.                            |

### `moveable`, `swipeable` & `focusable`

```svelte
<script>
	import { moveable, swipeable, focusable } from '@svelte-atoms/vibra/gestures';
	import { animate } from '@svelte-atoms/vibra/animate';
</script>

<!-- Magnetic button: springs toward the cursor, settles back on leave -->
<button {@attach moveable({ applyTransform: true, strength: 0.4 })}>Save</button>

<!-- Headless tilt: drive any property from the normalised coordinates -->
<div {@attach moveable({ onMove: ({ nx, ny }, el) => animate(el, { rotateY: nx * 12 }) })}></div>

<!-- Swipe a card away -->
<div {@attach swipeable({ axis: 'x', onSwipe: (dir) => dir === 'left' && dismiss() })}></div>

<!-- Keyboard-focus parity with hover -->
<button
	{@attach focusable({
		onFocusStart: (el) => animate(el, { scale: 1.05 }),
		onFocusEnd: (el) => animate(el, { scale: 1 })
	})}>Tab to me</button
>
```

| `moveable` option | Default | Effect                                                                           |
| ----------------- | ------- | -------------------------------------------------------------------------------- |
| `applyTransform`  | `false` | Apply a springy magnetic pull via `--motion-x` / `--motion-y` (report-only off). |
| `strength`        | `0.3`   | Magnetic pull as a fraction of the pointer's offset from centre.                 |
| `spring`          | —       | Spring used for the snap back to rest on leave.                                  |
| `includeTouch`    | `false` | Also react to touch pointers.                                                    |

| `swipeable` option  | Default  | Effect                                                   |
| ------------------- | -------- | -------------------------------------------------------- |
| `axis`              | `'both'` | Restrict recognised swipes to `'x'` or `'y'`.            |
| `threshold`         | `30`     | Minimum travel (px) to count as a swipe.                 |
| `velocityThreshold` | `300`    | Release speed (px/s) that counts regardless of distance. |

`focusable` mirrors `hoverable`: `onFocusStart` / `onFocusEnd`, with `disabled` to opt out.

`pressable` adds two discrete variants on the same lifecycle:

| `pressable` option | Default | Effect                                                                                     |
| ------------------ | ------- | ------------------------------------------------------------------------------------------ |
| `onLongPress`      | —       | Fires when a press is held past `longPressDelay`, then suppresses the following `onPress`. |
| `onDoubleTap`      | —       | Fires when two completed presses land within `doubleTapDelay`.                             |
| `longPressDelay`   | `500`   | Hold time (ms) before a long press fires.                                                  |
| `doubleTapDelay`   | `300`   | Maximum gap (ms) between two presses to count as a double tap.                             |

### `pinchable`, `wheelable` & `reorder`

```svelte
<script>
	import { pinchable, wheelable, reorder } from '@svelte-atoms/vibra/gestures';

	let list = $state(['Alpha', 'Beta', 'Gamma']);
	const r = reorder({ items: () => list, onReorder: (next) => (list = next) });
</script>

<!-- Two-finger pinch-zoom + rotate; writes --motion-scale / --motion-rotate -->
<!-- Wheel/trackpad zoom shares --motion-scale, so the two compose on one element -->
<img
	{@attach pinchable({ scaleBounds: { min: 0.5, max: 4 } })}
	{@attach wheelable({ scaleBounds: { min: 0.5, max: 4 } })}
	alt=""
/>

<!-- Drag to reorder -->
{#each list as value (value)}
	<div {@attach r.item(value)}>{value}</div>
{/each}
```

| `pinchable` option | Default | Effect                                              |
| ------------------ | ------- | --------------------------------------------------- |
| `applyTransform`   | `true`  | Write `--motion-scale` / `--motion-rotate` live.    |
| `rotate`           | `true`  | Track rotation as well as scale.                    |
| `scaleBounds`      | —       | `{ min, max }` clamp on the reported/applied scale. |

| `wheelable` option | Default | Effect                                              |
| ------------------ | ------- | --------------------------------------------------- |
| `applyTransform`   | `true`  | Write `--motion-scale` on each tick.                |
| `scaleBounds`      | —       | `{ min, max }` clamp on the reported/applied scale. |
| `speed`            | `0.01`  | Zoom sensitivity per wheel unit.                    |
| `requireCtrl`      | `false` | Only act when `ctrlKey` is held (trackpad pinch).   |
| `preventDefault`   | `true`  | Stop the page scrolling / browser-zooming.          |
| `smooth`           | `true`  | Spring-ease applied scale; `false` or `SpringOptions`. |

| `reorder` option | Default | Effect                                                     |
| ---------------- | ------- | ---------------------------------------------------------- |
| `items`          | —       | Reactive thunk returning the current ordered list.         |
| `onReorder`      | —       | Called with the new array when a drag drops on a new slot. |
| `axis`           | `'y'`   | `'x'` for horizontal lists.                                |
| `duration`       | `220`   | Settle (FLIP-into-slot) length in ms.                      |
