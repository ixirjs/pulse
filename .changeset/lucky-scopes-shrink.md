---
'@ixirjs/pulse': minor
---

**Breaking:** `createFlipScope()` no longer takes options and no longer returns `clear()`. The `layoutTtlMs` option (and its `CreateFlipScopeOptions` type) is gone — layout records expire after a fixed 250ms, which is already far longer than any unmount/mount handoff, so neither knob had a use. Replace `const { flip, clear } = createFlipScope(opts)` with `const { flip } = createFlipScope()`.
