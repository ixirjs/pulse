---
'@ixirjs/pulse': patch
---

Bug fixes from a performance / DX review:

- `parsePath` / `morph()` no longer hang on malformed path data (e.g. `M0 0 Z 1`, `M0 0 L?`); parsing stops at the first error, as SVG renderers do.
- `onUpdate` (animate), `frameTween` frames and `createSpringValue` listeners can now cancel/stop their animation from inside the callback; previously the rAF loop re-armed itself and ran forever.
