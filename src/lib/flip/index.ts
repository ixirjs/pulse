/**
 * Public entry point for the FLIP module.
 *
 * Everything a consumer needs — `flip`, `snapshotRect`, `flipFrom`,
 * `createFlipScope`, `anchoredFlip` — lives here. Observers, schedulers, and
 * the layout bridge are internals and deliberately not exported.
 */

import type { Attachment } from 'svelte/attachments';
import type { AnimationController } from '../animate/types';
import { animateFlip } from './animation/animator';
import { createFlipAttachment } from './integration/attachment.svelte';
import { createLayoutBridge } from './integration/bridge';
import { measure } from './geometry';
import type { FlipOptions, FlipOptionsInput, FlipRect, FlipScope, MotionElement } from './types';

// ---------------------------------------------------------------------------
// High-level API
// ---------------------------------------------------------------------------

/**
 * FLIP attachment for Svelte 5. Each instance owns its own state.
 * For cross-component shared-element transitions use {@link createFlipScope}.
 *
 * @example
 * ```svelte
 * <div {@attach flip()}>auto-tracks layout shifts</div>
 * <div {@attach flip({ duration: 320 })}>...</div>
 * <!-- Remeasure when rune dependencies change: -->
 * <div {@attach flip({ auto: () => { void open; } })}>...</div>
 * ```
 */
export const flip = <T extends MotionElement>(input?: FlipOptionsInput): Attachment<T> =>
	createFlipAttachment(input, null);

/** Capture an element's current rect to pass to {@link flipFrom} later. */
export const snapshotRect = measure;

/** Animate an element from a captured rect to its current position. */
export const flipFrom = (
	element: MotionElement,
	from: FlipRect,
	options: FlipOptions = {}
): AnimationController | null => animateFlip({ element, from, to: measure(element), options });

/** Animate an element from its current position to a captured rect. */
export const flipTo = (
	element: MotionElement,
	to: FlipRect,
	options: FlipOptions = {}
): AnimationController | null =>
	animateFlip({ element, from: measure(element), to, options, forward: true });

/**
 * Create an isolated FLIP scope with a shared-layout registry.
 * Use `layoutId` on attachments from the same scope for cross-component
 * shared-element transitions. No global state involved.
 *
 * @example
 * ```ts
 * const { flip } = createFlipScope();
 * ```
 * ```svelte
 * <div {@attach flip({ layoutId: "hero" })}>...</div>
 * ```
 */
export const createFlipScope = (): FlipScope => {
	const bridge = createLayoutBridge();
	return {
		flip: (input?: FlipOptionsInput) => createFlipAttachment(input, bridge)
	};
};

export { anchoredFlip } from './anchored';
export type {
	AnchoredFlipNodeFunction,
	AnchoredFlipOptions,
	AnchoredFlipReference,
	AnchoredFlipReferenceGetter
} from './anchored';

// ---------------------------------------------------------------------------
// Low-level re-exports
// ---------------------------------------------------------------------------

export { createFlipSwitcher } from './integration/switcher.svelte';
export type { FlipSwitcher, FlipSwitchRole } from './integration/switcher.svelte';

export { animateFlip } from './animation/animator';
export { measure } from './geometry';
// Public because `FlipOptions.auto` accepts an ObserverManager.
export { createObserverManager } from './tracking/observers';
export type { ObserverManager } from './tracking/observers';

export type * from './types';
