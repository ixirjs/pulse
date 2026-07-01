import type { Attachment } from 'svelte/attachments';
import type { FlipRect, FlipRectPair } from '$lib/animate/flip';
import type { EasingFn, MotionElement } from '$lib/shared/types';
import type { ObserverManager } from './tracking/observer-manager';

// ---------------------------------------------------------------------------
// Core geometry
// ---------------------------------------------------------------------------

export type { FlipRect, FlipRectPair, MotionElement };

// ---------------------------------------------------------------------------
// Option types
// ---------------------------------------------------------------------------

export type FlipEasing = EasingFn | string;

export type FlipDuration = number | ((distance: number, rects: FlipRectPair) => number);

export type FlipAuto = false | (() => void) | ObserverManager;

/**
 * Controls whether a particular reflow cycle should be skipped (no animation
 * played). `true` skips every cycle; a function receives the zero-based render
 * index and the rect pair so callers can implement arbitrary logic.
 */
export type FlipSkip = boolean | ((render: number, rects: FlipRectPair) => boolean);

export interface FlipOpacity {
	from?: number;
	to?: number;
}

export interface FlipOptions {
	/** Duration in ms, or a function of diagonal distance. */
	duration?: FlipDuration;
	/** Easing function or CSS easing string. Default: `cubicOut`. */
	easing?: FlipEasing;
	/** Animation delay in ms. */
	delay?: number;
	/** Animate translation. Default: `true`. */
	translate?: boolean;
	/** Animate scale (size change). Default: `true`. */
	scale?: boolean;
	/** Crossfade opacity during the animation. */
	opacity?: FlipOpacity | boolean;
	/**
	 * Cross-component shared transition id. Only honored when the attachment
	 * is created from a {@link FlipScope}.
	 */
	layoutId?: string;
	/**
	 * Control automatic layout tracking.
	 *
	 * - `false` / omitted: no automatic tracking
	 * - `() => void`: remeasure whenever rune state read inside the callback changes
	 * - `ObserverManager`: use the provided observer manager (see `createObserverManager`)
	 */
	auto?: FlipAuto;
	/** Disable animation entirely (still tracks rects). */
	disabled?: boolean;
	/**
	 * Skip reflow cycles selectively.
	 *
	 * - `true`: skip every cycle (effectively disables animation).
	 * - `false` / omitted: never skip.
	 * - `(render, rects) => boolean`: called with the zero-based render index
	 *   and the `{ from, to }` rect pair; return `true` to skip that cycle.
	 *
	 * The most common use-case is skipping only the very first render:
	 * `skip: (n) => n === 0`
	 */
	skip?: FlipSkip;
	/** Disable `pointer-events` while animating. */
	disablePointerEvents?: boolean;
	/** Honor `prefers-reduced-motion`. Default: `true`. */
	respectReducedMotion?: boolean;
	/** Composite mode for the WAAPI animation. */
	composite?: CompositeOperation;
	onStart?: (el: Element, rects: FlipRectPair) => void;
	onEnd?: (el: Element, info: { finished: boolean; rects: FlipRectPair }) => void;
}

export type FlipOptionsInput = FlipOptions | (() => FlipOptions) | null | undefined;

// ---------------------------------------------------------------------------
// Animator args
// ---------------------------------------------------------------------------

export interface FlipAnimateArgs {
	element: MotionElement;
	from: FlipRect;
	to: FlipRect;
	options?: FlipOptions;
	/**
	 * When `true`, run a *forward* animation: the DOM stays at `from` and the
	 * element is driven visually toward `to` via keyframes `[0 → Δ]`.
	 *
	 * Use this when the DOM has **not** yet been moved to `to` (e.g. a collapse
	 * animation where the element is about to be removed). Standard FLIP
	 * (`forward: false`, the default) requires the DOM to already be at `to`.
	 */
	forward?: boolean;
}

// ---------------------------------------------------------------------------
// Public scope API
// ---------------------------------------------------------------------------

export interface CreateFlipScopeOptions {
	/** Time in ms a layoutId rect remains valid after unmount. Default: 250. */
	layoutTtlMs?: number;
}

export interface FlipScope {
	/** Attachment factory bound to this scope's shared-layout registry. */
	flip: (input?: FlipOptionsInput) => Attachment<MotionElement>;
	/** Drop all stored layouts (useful between routes / tests). */
	clear: () => void;
}
