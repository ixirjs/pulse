/**
 * `viewTransition()` — drive a native View Transition with the library's
 * spring/easing engine, behind the uniform {@link AnimationController}.
 */

import { isBrowser, shouldReduceMotion } from '../shared/browser';
import type { AnimationController } from '../animate/types';
import { createViewTransitionController, resolvedController } from './controller';
import type { ViewTransitionOptions, ViewTransitionUpdate } from './types';

/** True when the current document supports the View Transitions API. */
export const supportsViewTransitions = (): boolean =>
	isBrowser() && typeof document.startViewTransition === 'function';

/** Run the update callback to completion, mapping any throw/return to a void promise. */
const runUpdate = (update: ViewTransitionUpdate): Promise<void> => {
	try {
		return Promise.resolve(update()).then(() => {});
	} catch (err) {
		return Promise.reject(err);
	}
};

/**
 * Animate a DOM change with the View Transitions API, re-eased by your spring
 * or easing of choice.
 *
 * The browser snapshots the page, runs `update` (mutate the DOM or Svelte
 * `$state` — `await tick()` so the change has flushed), snapshots again, then
 * morphs between the two. Tag shared elements with {@link viewTransitionName}
 * so they animate as one across the change.
 *
 * Falls back to running `update` with no animation when the API is unavailable
 * (Firefox, older Safari), under `prefers-reduced-motion`, or during SSR — and
 * still returns a resolved controller you can `await`.
 *
 * @example
 * ```ts
 * viewTransition(async () => {
 *   layout = layout === 'grid' ? 'list' : 'grid';
 *   await tick();
 * }, { spring: { stiffness: 240, damping: 24 } });
 * ```
 */
export const viewTransition = (
	update: ViewTransitionUpdate,
	options: ViewTransitionOptions = {}
): AnimationController => {
	if (
		!isBrowser() ||
		!supportsViewTransitions() ||
		shouldReduceMotion(options.respectReducedMotion)
	) {
		return resolvedController(runUpdate(update));
	}

	const transition = document.startViewTransition(update);
	return createViewTransitionController(transition, options);
};
