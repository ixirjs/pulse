---
'@ixirjs/pulse': minor
---

Behavior changes from a performance / DX review:

- Presence transitions (`fade`, `fly`, `scale`, `size`) and `animateGradient()` now honor `prefers-reduced-motion` like the rest of the library: they skip the delay and the tween. Each gains a `respectReducedMotion` option (default `true`); pass `false` to opt out.
