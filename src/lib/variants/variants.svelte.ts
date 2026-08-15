/**
 * Variants — named animation states layered over `animate()`.
 *
 * Define a set of states once, then move between them by name. Each transition
 * interrupts the previous one by committing the live values first (via the
 * controller's `stop()`), so re-targeting mid-flight starts from the on-screen
 * position instead of snapping.
 *
 * `createVariants()` is the imperative controller; `variants()` is the Svelte
 * attachment that drives it from reactive state.
 *
 * @example
 * ```svelte
 * <script>
 *   let state = $state('rest');
 * </script>
 *
 * <button
 *   onpointerenter={() => (state = 'hover')}
 *   onpointerleave={() => (state = 'rest')}
 *   {@attach variants({
 *     active: () => state,
 *     initial: 'rest',
 *     variants: { rest: { scale: 1 }, hover: { scale: 1.05 } },
 *     defaults: { spring: { stiffness: 300, damping: 24 } },
 *   })}
 * >Hover me</button>
 * ```
 */

import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '../shared/browser';
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

/**
 * Create an imperative variants controller bound to `element`.
 *
 * @example
 * ```ts
 * const v = createVariants(node, {
 *   variants: { rest: { scale: 1 }, hover: { scale: 1.05 } },
 *   initial: 'rest',
 * });
 * v.to('hover');
 * ```
 */
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

export interface VariantsAttachmentOptions {
	/** The named states. */
	variants: VariantMap;
	/** Reactive thunk returning the currently active state name. */
	active: () => string;
	/** State to snap to on mount. Defaults to the first `active()` value. */
	initial?: string;
	/** Animate the initial state instead of snapping to it. Default false. */
	animateInitial?: boolean;
	/** Shared `animate()` defaults for every transition. */
	defaults?: AnimateDefaults;
}

/** Create a reactive variants attachment. */
export const variants = (options: VariantsAttachmentOptions): Attachment<MotionElement> => {
	return (element) => {
		if (!isBrowser()) return;

		const first = untrack(() => options.active());
		const startState = options.initial ?? first;

		const controller = createVariants(element, {
			variants: options.variants,
			defaults: options.defaults,
			// Snap to the start state unless an animated entrance was requested.
			initial: options.animateInitial ? undefined : startState
		});
		if (options.animateInitial) controller.to(startState);

		// Animate whenever the active state name changes.
		$effect(() => {
			const name = options.active();
			if (name !== untrack(() => controller.current)) controller.to(name);
		});

		return () => controller.stop();
	};
};
