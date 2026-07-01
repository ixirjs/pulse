/**
 * Public entry point for the `view-transition` module.
 *
 * Drives the native View Transitions API with the library's spring/easing
 * engine. Unlike plain CSS-driven view transitions, the morph is re-eased with
 * your `spring`/`easing` and exposed through the same {@link AnimationController}
 * every other feature returns. Falls back to an un-animated DOM update when the
 * API is unavailable (Firefox, older Safari), under reduced motion, or in SSR.
 *
 * @example
 * ```svelte
 * <script>
 *   import { viewTransition, viewTransitionName } from '@svelte-atoms/vibra/view-transition';
 *   import { tick } from 'svelte';
 *   let layout = $state('grid');
 *   const toggle = () =>
 *     viewTransition(async () => { layout = layout === 'grid' ? 'list' : 'grid'; await tick(); },
 *       { spring: { stiffness: 240, damping: 24 } });
 * </script>
 * {#each items as item (item.id)}
 *   <div {@attach viewTransitionName(item.id)}>{item.label}</div>
 * {/each}
 * ```
 */

export { viewTransition, supportsViewTransitions } from './view-transition';
export { viewTransitionName } from './name.svelte';
export { viewTransitionNavigate } from './navigation';

export type { ViewTransitionOptions, ViewTransitionUpdate } from './types';
export type { ViewTransitionNameInput } from './name.svelte';
export type { NavigationLike } from './navigation';
