/**
 * SvelteKit glue — wrap a view transition around a client-side navigation.
 *
 * Kept framework-decoupled: rather than importing SvelteKit's navigation
 * module, `navigation` is typed structurally so the
 * helper works with any object exposing a `complete` promise.
 */

import { isBrowser, shouldReduceMotion } from '../shared/browser';
import { supportsViewTransitions, viewTransition } from './view-transition';
import type { ViewTransitionOptions } from './types';

/** Structural shape of SvelteKit's `Navigation` — only `complete` is needed. */
export interface NavigationLike {
	/** Resolves once the destination page has rendered. */
	complete: Promise<unknown>;
}

/**
 * Wrap a SvelteKit navigation in a {@link viewTransition}. Call it from
 * `onNavigate`; return its result so SvelteKit waits for the snapshot before
 * swapping the DOM. Returns `undefined` (a plain navigation) when the API is
 * unavailable or reduced motion is requested.
 *
 * Register this with SvelteKit's `onNavigate` hook and return its result.
 */
export const viewTransitionNavigate = (
	navigation: NavigationLike,
	options: ViewTransitionOptions = {}
): Promise<void> | void => {
	if (
		!isBrowser() ||
		!supportsViewTransitions() ||
		shouldReduceMotion(options.respectReducedMotion)
	) {
		return;
	}

	return new Promise<void>((resolve) => {
		viewTransition(async () => {
			// Release SvelteKit to perform the navigation (DOM swap), then hold the
			// transition's "after" snapshot until the new page has rendered.
			resolve();
			await navigation.complete;
		}, options);
	});
};
