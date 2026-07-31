/**
 * `variants()` — a Svelte 5 attachment that drives {@link createVariants} from
 * reactive state. Pass a thunk returning the active state name; the element
 * animates to that state whenever it changes.
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
import type { MotionElement } from '../animate';
import { createVariants, type VariantMap } from './variants';
import type { AnimateDefaults } from '../animate';

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
