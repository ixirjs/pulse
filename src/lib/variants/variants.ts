/**
 * Variants — named animation states layered over `animate()`.
 *
 * Define a set of states once, then move between them by name. Each transition
 * interrupts the previous one by committing the live values first (via the
 * controller's `stop()`), so re-targeting mid-flight starts from the on-screen
 * position instead of snapping.
 *
 * This is the framework-agnostic imperative core; `variants()` (the Svelte
 * attachment) drives it from reactive state.
 *
 * @example
 * ```ts
 * const v = createVariants(node, {
 *   variants: {
 *     rest:    { scale: 1, y: 0 },
 *     hover:   { scale: 1.05, y: -4 },
 *     pressed: { scale: 0.96 },
 *   },
 *   initial: 'rest',
 *   defaults: { spring: { stiffness: 300, damping: 24 } },
 * });
 * v.to('hover');
 * ```
 */

import { animate } from '../animate';
import type { AnimateDefaults, AnimateProps, AnimationController, MotionElement } from '../animate';

/** Map of state name → target props. */
export type VariantMap = Record<string, AnimateProps>;

export interface VariantsOptions {
	/** The named states. */
	variants: VariantMap;
	/** State to apply immediately on creation (no animation). */
	initial?: string;
	/** Shared `animate()` defaults applied to every transition. */
	defaults?: AnimateDefaults;
}

export interface VariantsController {
	/** The most recently targeted state name. */
	readonly current: string | null;
	/** Animate to a named state. Returns the controller, or `null` if unknown. */
	to(name: string, overrides?: AnimateDefaults): AnimationController | null;
	/** Snap to a named state instantly (no animation). */
	apply(name: string): void;
	/** Stop the in-flight transition, committing the current values. */
	stop(): void;
}

/** Create an imperative variants controller bound to `element`. */
export const createVariants = (
	element: MotionElement,
	options: VariantsOptions
): VariantsController => {
	const { variants, defaults, initial } = options;
	let current: string | null = null;
	let active: AnimationController | null = null;

	const apply = (name: string): void => {
		const props = variants[name];
		if (!props) return;
		active?.stop();
		active = animate(element, props, { ...defaults, duration: 0 });
		current = name;
	};

	const to = (name: string, overrides?: AnimateDefaults): AnimationController | null => {
		const props = variants[name];
		if (!props) return null;
		// Commit the in-flight position so the new transition starts from there.
		active?.stop();
		current = name;
		active = animate(element, props, { ...defaults, ...overrides });
		return active;
	};

	if (initial != null) apply(initial);

	return {
		get current() {
			return current;
		},
		to,
		apply,
		stop: () => active?.stop()
	};
};
