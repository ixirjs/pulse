---
'@ixirjs/pulse': patch
---

Bug fixes from a performance / DX review:

- `parsePath` / `morph()` no longer hang on malformed path data (e.g. `M0 0 Z 1`, `M0 0 L?`); parsing stops at the first error, as SVG renderers do.
- `onUpdate` (animate), `frameTween` frames and `createSpringValue` listeners can now cancel/stop their animation from inside the callback; previously the rAF loop re-armed itself and ran forever.
- Cancelling an `animate()` controller more than once, or after it finished, no longer releases a newer animation's transform ownership (which dropped its layer hint and confused FLIP measurement).
- Shared-layout records (`createFlipScope`) for ids that never return are now evicted on the next write, so long-lived scopes over feeds or virtual lists no longer grow without bound.
- `wheelable()` now releases its `will-change` layer hint when the attachment is removed mid-gesture.
- Timeline positioning now counts `iterations`: an entry with `iterations: 3` occupies three cycles before the next appended entry starts. Entries positioned after an `iterations: Infinity` entry are never reached and are skipped.
- `inView({ amount })` now enforces the visibility ratio in every engine. Spec-conformant browsers (Firefox) report `isIntersecting` at any overlap, so `onEnter` used to fire, and `onLeave` was skipped, below the requested amount.
- The `svelte` peer range is now `^5.29.0`, the first release with attachments (`{@attach}`, `svelte/attachments`), which the public API depends on.
- README: removed the `skewX` / `skewY` shorthands, which were never implemented (there is no individual CSS `skew` property to compose through), and listed the missing `z`.
- Easing presets are annotated `/* @__PURE__ */`, so importing a single easing no longer pulls in every preset (`{ easeOut }`: 614 B → 353 B brotli).
