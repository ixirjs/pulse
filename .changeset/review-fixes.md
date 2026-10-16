---
'@ixirjs/pulse': patch
---

Bug fixes from a performance / DX review:

- `parsePath` / `morph()` no longer hang on malformed path data (e.g. `M0 0 Z 1`, `M0 0 L?`); parsing stops at the first error, as SVG renderers do.
