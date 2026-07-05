# scroll

Scroll-driven animation for Svelte 5. Two complementary primitives: bind an animation's _progress_ to scroll position, or _trigger_ effects when an element crosses the viewport.

| File          | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scroll.ts`   | `scroll(options)` — a Svelte attachment that drives a paused [`AnimationController`](../animate/README.md) by seeking it: progress `0…1` maps to `0…totalDuration`. Rather than depend on the still-patchy native `ScrollTimeline`, it pauses the animation and `seek()`s it on every scroll frame, so it works in every browser and composes with springs, per-prop timing, and the `--motion-*` chain. Also accepts a raw `onProgress(p)` callback. |
| `in-view.ts`  | `inView(options)` — an `IntersectionObserver`-backed attachment that fires `onEnter` / `onLeave` (with `once`, `amount`, `margin`, `root`). This is the "play when in view" / `whileInView` primitive.                                                                                                                                                                                                                                                |
| `progress.ts` | Pure, DOM-free progress math (`coverProgress`, `containProgress`, `pageProgress`) so the mapping is unit-testable without a browser.                                                                                                                                                                                                                                                                                                                  |

```svelte
<script>
	import { scroll, inView } from '@ixirjs/pulse/scroll';
	import { animate } from '@ixirjs/pulse/animate';
</script>

<!-- Progress-linked: element parallax as it crosses the viewport -->
<div {@attach scroll({ animation: (el) => animate(el, { y: [40, -40], opacity: [0, 1] }) })}>…</div>

<!-- Trigger-based: reveal once on enter -->
<div
	{@attach inView({ once: true, onEnter: (el) => animate(el, { opacity: [0, 1], y: [24, 0] }) })}
>
	…
</div>

<!-- Reading-progress bar -->
<div {@attach scroll({ range: 'page', onProgress: (p) => (bar.style.scaleX = String(p)) })} />
```

### Ranges

| `range`             | Maps progress across                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `'cover'` (default) | The element crossing the viewport — `0` about to enter, `1` fully gone. |
| `'contain'`         | Only the span where the element is fully visible.                       |
| `'page'`            | Whole-scroller progress; ignores the element.                           |

Pass `axis: 'x'` for horizontal scrollers and `container` to track a scrollable element instead of the window.
