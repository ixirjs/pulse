/**
 * FLIP switcher — animates between a source and a target element based on
 * a resolver function that returns `'source'` or `'target'`.
 *
 * When the resolver changes, the newly-active element plays a FLIP animation
 * from the previously-active element's last-known rect to its own position.
 * Because rects are captured in `$effect.pre` (before any DOM update), this
 * works correctly even when the outgoing element is hidden or removed from
 * layout as a result of the same state change.
 *
 * @example
 * ```ts
 * const switcher = createFlipSwitcher(() => tab === 'a' ? 'source' : 'target');
 * ```
 * ```svelte
 * <div {@attach switcher.source}>Panel A</div>
 * <div {@attach switcher.target}>Panel B</div>
 * ```
 */

import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '../shared/browser';
import { createControllerSlot } from './controller-slot';
import { measure } from './geometry';
import type { FlipOptions, FlipRect, MotionElement } from './types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FlipSwitchRole = 'source' | 'target';

export interface FlipSwitcher {
	/** Attach to the element that acts as the *source* (initial / "from") side. */
	source: Attachment<MotionElement>;
	/** Attach to the element that acts as the *target* (secondary / "to") side. */
	target: Attachment<MotionElement>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a FLIP switcher that animates between two elements.
 *
 * @param resolver  Reactive function returning `'source'` or `'target'`.
 *                  Attach the result to elements via `{@attach switcher.source}`
 *                  and `{@attach switcher.target}`.
 * @param options   Standard FLIP options applied to both transitions.
 */
export const createFlipSwitcher = (
	resolver: () => FlipSwitchRole,
	options: FlipOptions = {}
): FlipSwitcher => {
	// Pre-DOM-update rects: always reflect the element's rect as it was just
	// *before* the last reactive flush. Used as the "from" rect when the other
	// role becomes active.
	const preRects: Partial<Record<FlipSwitchRole, FlipRect>> = {};

	const makeAttachment = (role: FlipSwitchRole): Attachment<MotionElement> => {
		return (element) => {
			if (!isBrowser()) return;

			const slot = createControllerSlot();
			let prevActive: FlipSwitchRole = untrack(resolver);

			// Snapshot own rect before every DOM update so the other role can use
			// it as the "from" origin even if this element becomes hidden/unmeasurable
			// after the update.
			$effect.pre(() => {
				void resolver(); // establish reactive dependency
				preRects[role] = measure(element);
			});

			// After the DOM update: if we just became the active role, animate from
			// the other element's pre-update rect.
			$effect(() => {
				const active = resolver();
				const previous = prevActive;
				prevActive = active;

				if (active === previous || active !== role) return;

				const otherRole: FlipSwitchRole = role === 'source' ? 'target' : 'source';
				const from = preRects[otherRole];
				if (!from) return;

				const to = measure(element);

				slot.run({ element, from, to, options });
			});

			return () => {
				delete preRects[role];
				slot.cancel();
			};
		};
	};

	return {
		source: makeAttachment('source'),
		target: makeAttachment('target')
	};
};
