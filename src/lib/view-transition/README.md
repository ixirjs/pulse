# view-transition

Drives the browser's native [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) with pulse's spring/easing engine. The browser still computes the old→new geometry; pulse **re-eases** the resulting pseudo-element animations, so you get GPU-composited morphs shaped by a spring — something plain CSS-driven view transitions can't do — exposed through the same [`AnimationController`](../animate/README.md) every other feature returns.

| File                 | Responsibility                                                                                                                                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `view-transition.ts` | `viewTransition(update, options)` — wraps `document.startViewTransition`, returns an `AnimationController`. `supportsViewTransitions()` feature-detects. Falls back to running `update` un-animated when the API is missing (Firefox, older Safari), under `prefers-reduced-motion`, or during SSR.         |
| `controller.ts`      | Wraps the running `ViewTransition` in the uniform controller. After `transition.ready` it collects the live `::view-transition-*` pseudo animations, re-times them with the resolved easing, and forwards `seek`/`pause`/`reverse`/`finished` to them. `resolvedController` is the no-transition fast-path. |
| `timing.ts`          | `resolveViewTransitionTiming(options)` — pure (DOM-free, node-tested) resolution of `spring`/`easing`/`duration` into an `EffectTiming` patch. Reuses `springEasing()` and `easingToCss()`.                                                                                                                 |
| `name.svelte.ts`     | `viewTransitionName(name)` — Svelte attachment that sets `view-transition-name` (static or reactive thunk) so an element morphs as a shared element. The counterpart of `flip({ layoutId })`.                                                                                                               |
| `navigation.ts`      | `viewTransitionNavigate(navigation, options)` — wrap a SvelteKit client navigation. Call from `onNavigate`. `navigation` is typed structurally (`{ complete }`) so the module never imports `$app/navigation`.                                                                                              |

```svelte
<script lang="ts">
	import { tick } from 'svelte';
	import { viewTransition, viewTransitionName } from '@ixirjs/pulse/view-transition';

	let layout = $state<'grid' | 'list'>('grid');
	const items = [
		{ id: 'a', label: 'Aurora' },
		{ id: 'b', label: 'Borealis' }
	];

	function toggle() {
		// startViewTransition snapshots before/after; await tick() lets Svelte
		// flush the DOM before the "after" snapshot is captured.
		viewTransition(
			async () => {
				layout = layout === 'grid' ? 'list' : 'grid';
				await tick();
			},
			{ spring: { stiffness: 240, damping: 24 } }
		);
	}
</script>

<div class:grid={layout === 'grid'} class:list={layout === 'list'}>
	{#each items as item (item.id)}
		<!-- shared name → each item morphs between layouts -->
		<div {@attach viewTransitionName(item.id)}>{item.label}</div>
	{/each}
</div>
<button onclick={toggle}>Toggle layout</button>
```

### SvelteKit page transitions

```ts
import { onNavigate } from '$app/navigation';
import { viewTransitionNavigate } from '@ixirjs/pulse/view-transition';

onNavigate((navigation) => viewTransitionNavigate(navigation, { spring: true }));
```

### Notes

- **Re-easing, not re-computing.** The native API positions the snapshots; pulse only reshapes the timing curve. Omit `spring`/`easing`/`duration` to keep the browser default.
- **Controllability.** Because the morph runs on real WAAPI `Animation` objects, `seek`/`pause`/`reverse` work — but only once `transition.ready` has resolved (the pseudo-elements exist). `cancel()`/`stop()` skip to the end state and take effect immediately.
- **Interactive local transitions.** The View Transitions specification removes captured elements from hit-testing while a transition is active. For an interruptible local morph, set `html { view-transition-name: none }`, put `viewTransitionName()` on a non-interactive child rather than its button/link, and let the transition pseudo-elements pass pointer input with `::view-transition { pointer-events: none }`.
- **Interruptions.** Starting another document transition cancels the active one, and the specification permits their asynchronous update callbacks to overlap. If updates depend on previous state, call `stop()`, await `finished`, and discard superseded requests before starting the replacement transition.
- **Relationship to FLIP.** [`flip()`](../flip/README.md) remains the choice for fully interruptible, retargetable layout animation and for shared-element transitions that must work in every browser. View transitions add native cross-document (MPA) navigations and zero manual rect bookkeeping where supported.
