---
'@ixirjs/pulse': minor
---

Replace `flip()`'s `auto` option with reactive `class` / `style` thunks.

`flip({ class: () => ClassValue })` and `flip({ style: () => string })` let the attachment own
the attribute: it writes the class or inline style itself, then measures and animates the
resulting layout change in the same tick — no discarded thunk and no frame of latency.

Layout auto-tracking (`ResizeObserver` + parent `MutationObserver`) is now always on, so a
shuffled `{#each}` animates with no option at all. Consequently `auto`, the `FlipAuto` type, and
`createObserverManager` / `ObserverManager` are removed from the public API — delete the `auto:`
option from existing call sites.

Note: use flip's `class` option or a dynamic `class={…}` in markup, not both on the same element
— Svelte assigns `className` wholesale and would drop flip's tokens. A static `class="…"` is safe.
