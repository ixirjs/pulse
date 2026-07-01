/**
 * Public types for the `timeline()` API.
 */

import type { AnimateDefaults, AnimateProps, MotionElement } from '../types';
import type { TimelinePosition } from './timeline-position';

export type { TimelinePosition };

export interface TimelineDefaults extends AnimateDefaults {
	/**
	 * If `true`, the timeline is built but not started until `play()` is called.
	 * If `false` (default), playback begins automatically on the next microtask
	 * after the first definition — matching `animate()`'s fire-and-forget feel.
	 */
	paused?: boolean;
}

export interface Timeline {
	/**
	 * Add an `animate()` call at a position. `options` overrides the timeline
	 * defaults; per-prop options inside `props` still override `options`.
	 */
	add(
		element: MotionElement,
		props: AnimateProps,
		options?: AnimateDefaults,
		position?: TimelinePosition
	): Timeline;

	/**
	 * Apply CSS values immediately at the given position — useful for "reset"
	 * frames between sequenced animations (e.g. `set(el, { opacity: 0 })`
	 * before fading in).
	 */
	set(element: MotionElement, props: AnimateProps, position?: TimelinePosition): Timeline;

	/** Fire a callback at the given position. */
	call(callback: () => void, position?: TimelinePosition): Timeline;

	/** Declare a named position for later reference. */
	label(name: string, position?: TimelinePosition): Timeline;

	/** Total duration in ms (max end across all entries). */
	readonly duration: number;

	/** All underlying WAAPI animations once materialized. */
	readonly animations: readonly Animation[];

	/** Resolves when every materialized animation finishes (or rejects on cancel). */
	readonly finished: Promise<void>;

	/** Currently-known labels. Mostly useful for debugging / introspection. */
	readonly labels: ReadonlyMap<string, number>;

	play(): Timeline;
	pause(): Timeline;
	reverse(): Timeline;
	cancel(): void;

	/**
	 * Commit each element's current in-flight animated values as inline styles,
	 * then cancel — the timeline equivalent of `AnimationController.stop()`.
	 * Useful for interrupting mid-flight and starting a new animation from the
	 * actual current position.
	 */
	stop(): void;

	/** Seek every materialized animation to `timeMs` from the timeline start. */
	seek(timeMs: number): Timeline;

	/**
	 * Set the playback rate of every underlying animation.
	 * Values `> 1` speed up, `< 1` slow down, negative values reverse.
	 * If called before materialization the rate is applied on play.
	 */
	setPlaybackRate(rate: number): Timeline;
}
