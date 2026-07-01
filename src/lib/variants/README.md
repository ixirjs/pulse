# variants

Named animation states layered over [`animate()`](../animate/README.md). Define a set of states once, then move between them by name — the orchestration primitive for interactive components (rest / hover / pressed, open / closed, …).

Each transition interrupts the previous one by committing the live on-screen values first (via the controller's `stop()`), so re-targeting mid-flight starts from where the element actually is instead of snapping back.

| File                 | Responsibility                                                                                                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variants.ts`        | `createVariants(element, options)` — the framework-agnostic imperative core. `to(name)` animates to a state, `apply(name)` snaps to it, `stop()` commits the in-flight values. `current` reports the last targeted state.                                              |
| `variants.svelte.ts` | `variants(options)` — a Svelte attachment that drives `createVariants` from reactive state. Pass an `active: () => string` thunk; an `$effect` animates to that state whenever it changes. Snaps to the initial state on mount (or animates it with `animateInitial`). |

```svelte
<script>
	import { variants } from '@svelte-atoms/vibra/variants';
	let state = $state('rest');
</script>

<button
	onpointerenter={() => (state = 'hover')}
	onpointerleave={() => (state = 'rest')}
	onpointerdown={() => (state = 'pressed')}
	onpointerup={() => (state = 'hover')}
	{@attach variants({
		active: () => state,
		initial: 'rest',
		variants: {
			rest: { scale: 1, y: 0 },
			hover: { scale: 1.05, y: -4 },
			pressed: { scale: 0.96, y: 0 }
		},
		defaults: { spring: { stiffness: 300, damping: 24 } }
	})}>Hover me</button
>
```

Prefer the imperative `createVariants()` when you are not in a Svelte component or want to drive states from your own event handling.
