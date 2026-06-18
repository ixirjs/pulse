# flip/integration

The Svelte 5 wiring for [`flip`](../README.md) — the `{@attach}` attachment, the shared-layout registry, and the higher-level scope and switcher factories.

| File | Responsibility |
| --- | --- |
| `attachment.svelte.ts` | `createFlipAttachment(input, bridge)` — the core attachment. Wires the animator to lifecycle events, detects reflows via `$effect`, optionally syncs with an `ObserverManager` for auto-tracking, and reads/writes layouts to the bridge for shared-element transitions. |
| `bridge.ts` | `createLayoutBridge(ttlMs?)` — an in-memory registry storing each `layoutId`'s last-known rect with a configurable TTL (default 250 ms), enabling handoff between an unmounting and a mounting element. |
| `scope.ts` | `createFlipScope(opts?)` — returns `{ flip, clear }`, wrapping a bridge + attachment into a self-contained namespace for cross-component shared transitions. |
| `switcher.svelte.ts` | `createFlipSwitcher(resolver, options?)` — animates between two elements. Uses `$effect.pre` to snapshot pre-update rects, then plays FLIP on the newly-active element when the role changes. Returns `{ source, target }` attachments. |

These rely on Svelte 5 runes (`$effect`, `$effect.pre`, `untrack`) and the `{@attach}` directive — hence the `.svelte.ts` extensions where rune syntax is used.
