# morph

SVG path morphing — tween an SVG `<path>`'s `d` between two shapes. WAAPI can't interpolate `d` across arbitrary command lists, so this normalizes both paths to a common cubic-bézier form, aligns them, and runs its own rAF loop.

| File             | Responsibility                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `parse.ts`       | `parsePath(d)` — character-scanning tokenizer that expands implicit repeats and correctly reads arc flags and scientific notation.                                                                                                                                                                                                                           |
| `normalize.ts`   | `normalizePath(d)` — converts every command (`M L H V C S Q T A Z`, relative or absolute) into absolute cubic-bézier subpaths. Lines become thirds-placed cubics, quadratics are elevated, arcs are split into ≤90° cubic segments.                                                                                                                          |
| `interpolate.ts` | `planMorph(from, to)` aligns the two paths subpath-by-subpath, growing the one with fewer segments by De Casteljau subdivision of its longest segments, then (via `minimizeAnchorTravel`) rotates/reverses each closed ring to the shortest-travel correspondence. `interpolatePlan(plan, t)` lerps every control point and serializes back to a `d` string. |
| `morph.ts`       | `morph(element, from, to, options)` — the rAF driver. Writes the interpolated `d` each frame; honors `prefers-reduced-motion`.                                                                                                                                                                                                                               |

```ts
import { morph } from '@svelte-atoms/vibra/morph';

const heart =
	'M12 21s-7-4.35-9.5-8.5C1 9 3 5 6.5 5 9 5 12 8 12 8s3-3 5.5-3C21 5 23 9 21.5 12.5 19 16.65 12 21 12 21z';
const star = 'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z';

morph(pathEl, heart, star, { duration: 600 });
```

### Options

| Option                 | Default  | Description                                                       |
| ---------------------- | -------- | ----------------------------------------------------------------- |
| `duration`             | `400`    | Tween length in ms.                                               |
| `easing`               | ease-out | Easing function.                                                  |
| `delay`                | `0`      | Delay before starting (ms).                                       |
| `respectReducedMotion` | `true`   | Snap to the target when reduced motion is requested.              |
| `optimize`             | `true`   | Rotate/reverse closed rings to the minimal-travel correspondence. |
| `onComplete`           | —        | Fired once when the morph settles.                                |

> **Structure alignment.** Within matching subpaths, differing segment counts are reconciled automatically by subdivision, so two shapes with different point counts still morph point-for-point. When the two paths have a **different number of subpaths** the morph can't pair them up and snaps to the target (same fallback philosophy as [`animateGradient`](../gradient/README.md)).
>
> **Minimal-distance anchor alignment** (`optimize`, on by default). For each closed subpath, the `from` ring is cyclically rotated — and reversed if its winding is opposite — to the orientation that minimizes total anchor travel against the `to` ring. This prevents the visible "twist" that happens when point 0 of one shape is paired with a far-away point on the other, so anchors take the shortest path. Open subpaths are left as-is (their start/end are fixed and must not rotate). Set `optimize: false` to pair anchors strictly in document order.
