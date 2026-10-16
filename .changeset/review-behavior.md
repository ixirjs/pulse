---
'@ixirjs/pulse': minor
---

Behavior changes from a performance / DX review:

- Presence transitions (`fade`, `fly`, `scale`, `size`) and `animateGradient()` now honor `prefers-reduced-motion` like the rest of the library: they skip the delay and the tween. Each gains a `respectReducedMotion` option (default `true`); pass `false` to opt out.
- `animate()`, `timeline().add()` and keyframe building now throw a `TypeError` naming the property when an input has no target: `[]`, `[100]`, `{ values: [] }`, or a timing-only object such as `{ duration: 200 }`. These inputs used to produce keyframes the browser silently ignored.
- `velocity` in sampled springs (`spring()`, `springEasing()`, `animate(…, { spring })`) is now in progress per second, consistent with the live spring and its own docs. It was divided by 1000 internally, so any value you passed is now 1000× stronger: divide existing values by 1000 to keep the old motion.
- Timeline `.call()` and `.set()` entries now follow the timeline clock instead of `setTimeout`. `pause()`, `seek()`, `setPlaybackRate()` and `cancel()` apply to them, an entry reversed before it is reached is skipped, and `finished` waits for them.
