# presence

Spring-powered enter/exit transitions that plug into Svelte's built-in `transition:` / `in:` / `out:` directives.

Svelte already _orchestrates_ presence — a keyed `{#each}` runs `out:` before unmount and `in:` on mount. What it lacks is spring timing. These transitions accept a `spring` option and derive **both** the eased curve and the natural settling `duration` from the simulation, so enters and exits feel like the rest of the library.

| File             | Responsibility                                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transitions.ts` | `fade`, `fly`, `scale`, and `size` — each returns a Svelte `TransitionConfig`. `resolveTiming()` turns a `spring` option into `{ duration, easing }` via [`springEasing()`](../animate/README.md), or falls back to a duration + ease-out when no spring is given. |

```svelte
<script>
	import { fly, fade, scale, size } from '@svelte-atoms/vibra/presence';
</script>

{#each items as item (item.id)}
	<div transition:fly={{ y: 24, spring: { stiffness: 240, damping: 22 } }}>{item.text}</div>
{/each}

<!-- Collapse height on mount/unmount (like Svelte's `slide`, spring-capable) -->
{#if open}
	<div transition:size={{ spring: true }}>…</div>
{/if}

<!-- Asymmetric in/out -->
{#if open}
	<div in:scale={{ start: 0.9, spring: true }} out:fade={{ duration: 150 }}>…</div>
{/if}
```

### Shared params

| Param      | Description                                                               |
| ---------- | ------------------------------------------------------------------------- |
| `spring`   | Spring physics for the curve + auto-sized duration. `true` uses defaults. |
| `duration` | Explicit ms; overrides the spring's natural duration.                     |
| `easing`   | Easing function; overrides the spring curve when both are given.          |
| `delay`    | Delay before the transition starts (ms).                                  |

`fly` adds `x` / `y` / `opacity`; `scale` adds `start` / `opacity`.

Both `fly` and `scale` also take **optional `width` / `height`** — a start size that tweens to the element's measured natural (auto-resolved) size _alongside_ the travel/pop. Omit them for transform-only behavior:

```svelte
<!-- Fly up from below while growing from 0 to the content width -->
<div transition:fly={{ y: 16, width: 0, spring: true }}>…</div>

<!-- Pop in while expanding height from a CSS length -->
<div transition:scale={{ start: 0.9, height: '1rem' }}>…</div>
```

| Param    | Description                                                       |
| -------- | ----------------------------------------------------------------- |
| `width`  | Start width; tweens to the natural width. Omit to leave width be. |
| `height` | Start height; tweens to the natural height. Omit to leave it be.  |

The start accepts a **px number or any CSS length** — `0`, `'2rem'`, `'50%'`, `'10vw'`, `'calc(…)'`. CSS values are resolved to px against the element in its real context (so `%` is relative to its containing block), then interpolated. The **target is always the element's natural size**, measured automatically — so `width: 0` grows to whatever `width: auto` would be, with no fixed pixel target needed.

The collapse scales the axis's **padding, border, and margin** by the same fraction as the width/height (just like `size`), so the box reaches a true zero footprint. Without this, `box-sizing: border-box` would floor the element at its padding (`width: 0` ⇒ still padding-wide), leaving a stub and a layout slot that snaps shut on unmount.

`size` collapses an element's **width and/or height** (with its padding, border, and margin on that axis) — the way to drive width/height on enter/exit. Like Svelte's `slide`, but either axis:

| Param     | Default | Description                                                           |
| --------- | ------- | --------------------------------------------------------------------- |
| `axis`    | `'y'`   | `'x'`, `'y'`, or `'both'` — which dimension(s) to collapse.           |
| `start`   | `0`     | Fraction of the natural size to start/end at (`0` = fully collapsed). |
| `opacity` | —       | Omit for size-only; pass `0` to fade alongside the collapse.          |

> These are CSS-driven transitions (they return a `css` function), so they animate `transform` / `opacity` directly and are independent of the `--motion-*` chain — appropriate for short-lived mount/unmount, where the element is not simultaneously being driven by `animate()`.
