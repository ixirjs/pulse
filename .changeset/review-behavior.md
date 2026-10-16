---
'@ixirjs/pulse': minor
---

Behavior changes from a performance / DX review:

- Presence transitions (`fade`, `fly`, `scale`, `size`) and `animateGradient()` now honor `prefers-reduced-motion` like the rest of the library: they skip the delay and the tween. Each gains a `respectReducedMotion` option (default `true`); pass `false` to opt out.
- `animate()`, `timeline().add()` and keyframe building now throw a `TypeError` naming the property when an input has no target: `[]`, `[100]`, `{ values: [] }`, or a timing-only object such as `{ duration: 200 }`. These inputs used to produce keyframes the browser silently ignored.
