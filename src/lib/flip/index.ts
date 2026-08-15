/**
 * Public entry point for the FLIP module.
 *
 * Everything a consumer needs — `flip`, `snapshotRect`, `flipFrom`,
 * `createFlipScope`, `anchoredFlip` — lives here. Observers, schedulers,
 * attribute application, and the layout bridge are internals and deliberately
 * not exported.
 */

import type { Attachment } from 'svelte/attachments';
import type { AnimationController } from '../animate/types';
import { animateFlip } from './animator';
import { createFlipAttachment } from './attachment.svelte';
import { createLayoutBridge } from './bridge';
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
 * <!-- Let flip own the attribute so the change is measured immediately: -->
 * <div {@attach flip({ class: () => ({ 'is-open': open }) })}>...</div>
 * <div {@attach flip({ style: () => (open ? 'height: 320px' : 'height: 64px') })}>...</div>
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

export { createFlipSwitcher } from './switcher.svelte';
export type { FlipSwitcher, FlipSwitchRole } from './switcher.svelte';

export { animateFlip } from './animator';
export { measure } from './geometry';

export type * from './types';
