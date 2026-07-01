/**
 * Public types for the `view-transition` module.
 */

import type { EasingFn, SpringInput } from '$lib/animate/types';

export type { EasingFn, SpringInput };

/**
 * Callback that mutates the DOM (or reactive state) between the browser's
 * before/after snapshots. May be async — return a promise (e.g. `await tick()`
 * after a Svelte `$state` change) and the transition waits for the new DOM to
 * settle before capturing the "after" snapshot.
 */
export type ViewTransitionUpdate = () => void | Promise<void>;

/**
 * Options for {@link viewTransition} and {@link viewTransitionNavigate}.
 *
 * The native View Transitions API animates its pseudo-elements with plain CSS;
 * supplying `spring` / `easing` / `duration` here *re-eases* the browser-computed
 * morph (geometry stays native, the curve becomes yours). Omit all three to keep
 * the browser default.
 */
export interface ViewTransitionOptions {
	/** Spring physics for the morph. `true` uses defaults. Takes precedence over `easing`. */
	spring?: SpringInput;
	/**
	 * Easing for the morph — an {@link EasingFn} (resampled to a WAAPI `linear()`
	 * string) or a raw CSS easing keyword/`cubic-bezier(...)` passed through.
	 */
	easing?: EasingFn | string;
	/** Duration of the morph in ms. Overrides a spring's natural duration when both are set. */
	duration?: number;
	/**
	 * Restrict re-easing to these `view-transition-name`s. Omit to re-ease every
	 * transition group (including the page-level root crossfade).
	 */
	names?: readonly string[];
	/** Honor `prefers-reduced-motion` — when reduced, runs the update with no transition. Default: `true`. */
	respectReducedMotion?: boolean;
	/** Called once the pseudo-elements exist (`transition.ready` resolved) and easing has been applied. */
	onReady?: () => void;
}
