/**
 * `timeline()` — sequence and parallelize `animate()` calls along a shared clock.
 *
 * Mental model:
 *  - The timeline has a running cursor and an internal duration.
 *  - Every entry (`add` / `set` / `call` / `label`) is placed at a position
 *    that may be absolute (number ms), relative (`"+=200"`), anchored to the
 *    last entry (`"<"` / `">"` with optional offset), or a named label.
 *  - Animations are materialized lazily on `play()` (or any access to
 *    `finished` / `animations`). Until then, the timeline is just a plan and
 *    can be mutated freely.
 *  - Once materialized, child WAAPI animations carry the timeline offset in
 *    their per-prop `delay`, so `pause()` / `play()` / `reverse()` /
 *    `cancel()` propagate cleanly to all of them.
 *
 * Position grammar:
 *   `undefined`                → append at current end (same as `">"`).
 *   `123`                      → absolute time in ms.
 *   `"+=200"`, `"-=100"`       → offset from current end.
 *   `">"`, `">+200"`, `">-50"` → end of last child (with optional offset).
 *   `"<"`, `"<+200"`, `"<-50"` → start of last child (with optional offset).
 *   `"label"`, `"label+=200"`  → at a previously declared label.
 *
 * @example
 * ```ts
 * timeline({ duration: 400, easing: easeOut })
 *   .add(card,    { y: [20, 0], opacity: [0, 1] })
 *   .add(title,   { y: [10, 0], opacity: [0, 1] }, undefined, '<+50')
 *   .label('reveal')
 *   .add(actions, { opacity: [0, 1] }, undefined, 'reveal+=100')
 *   .call(() => emit('opened'), '>+100')
 *   .play();
 * ```
 */

import { animate } from '../core/animate.js';
import { createController } from '../core/controller.js';
import type { AnimateDefaults, AnimateProps, AnimationController, MotionElement } from '../types.js';
import { type Anchor, type TimelinePosition, resolvePosition } from './timeline-position.js';
import {
	type Entry,
	type SetEntry,
	computeAnimateDuration,
	offsetProps
} from './timeline-internals.js';
import { isBrowser, shouldReduceMotion } from '../../shared/browser.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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

	/**
	 * Fire a callback at the given position. Like `set()`, it follows the
	 * timeline clock: pause / seek / playback rate apply, it is skipped when
	 * reversed before being reached, and `finished` waits for it.
	 */
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

// ---------------------------------------------------------------------------
// Timeline factory
// ---------------------------------------------------------------------------

const EMPTY_ANIMATIONS: readonly Animation[] = Object.freeze([]);
const NOOP = (): void => {};

export const timeline = (defaults: TimelineDefaults = {}): Timeline => {
	const { paused = false, ...animateDefaults } = defaults;
	const entries: Entry[] = [];
	const labels = new Map<string, number>();
	const anchor: Anchor = { duration: 0, lastStart: 0, lastEnd: 0, labels };

	// Materialization state.
	let materialized = false;
	const controllers: AnimationController[] = [];
	let cachedAnimations: readonly Animation[] | undefined;
	let cancelled = false;

	// Aggregate finished promise, lazily built (mirrors `controller.ts` style).
	let finishedPromise: Promise<void> | undefined;

	const updateAnchor = (entry: Entry): void => {
		anchor.lastStart = entry.start;
		anchor.lastEnd = entry.end;
		if (entry.end > anchor.duration) anchor.duration = entry.end;
	};

	const ensureNotMaterialized = (op: string): void => {
		if (materialized) {
			throw new Error(
				`[timeline] Cannot call .${op}() after the timeline has started. ` +
					`Build the full timeline before play()/finished/animations.`
			);
		}
	};

	// -------------------------------------------------------------------------
	// Materialization
	// -------------------------------------------------------------------------

	// Fire synchronously at time 0, or when reduced motion collapses every
	// animate() entry to its end state. Otherwise ride an empty, target-less
	// "marker" animation delayed to `startMs`: it lives in `controllers`, so
	// pause / seek / reverse / playback rate / cancel and `finished` all reach
	// it the same way they reach the real animations.
	const scheduleAt = (startMs: number, fn: () => void): void => {
		if (startMs <= 0 || shouldReduceMotion(animateDefaults.respectReducedMotion)) {
			fn();
			return;
		}
		const marker = new Animation(new KeyframeEffect(null, null, { delay: startMs }));
		const ctrl = createController({
			element: document.documentElement,
			animations: [marker],
			defaults: {},
			finalStyles: [],
			restorations: []
		});
		marker.play();
		// Played back to 0 (reversed before reaching it) or cancelled: don't fire.
		ctrl.finished.then(() => {
			if (ctrl.playbackRate > 0) fn();
		}, NOOP);
		controllers.push(ctrl);
	};

	const materialize = (): void => {
		if (materialized) return;
		materialized = true;
		if (!isBrowser()) return;

		const animations: Animation[] = [];
		for (const entry of entries) {
			// Positioned after an infinitely looping entry: it would never be reached.
			if (!Number.isFinite(entry.start)) continue;
			if (entry.kind === 'animate') {
				const ctrl = animate(
					entry.element,
					offsetProps(entry.props, entry.options, entry.start),
					entry.options
				);
				controllers.push(ctrl);
				animations.push(...ctrl.animations);
			} else if (entry.kind === 'set') {
				scheduleAt(entry.start, () => applySetEntry(entry));
			} else {
				scheduleAt(entry.start, () => {
					try {
						entry.callback();
					} catch (e) {
						reportError(e);
					}
				});
			}
		}

		// Real animations only — the call/set markers are an implementation detail.
		cachedAnimations = animations;

		// Apply any pre-materialization rate through the same controller setter the
		// live setPlaybackRate() uses, so playback-rate changes have one code path.
		if (pendingPlaybackRate !== undefined) {
			const rate = pendingPlaybackRate;
			forEachCtrl((c) => (c.playbackRate = rate));
		}
	};

	const applySetEntry = (entry: SetEntry): void => {
		// Use a 0-duration `animate()` call so transform wiring + property
		// registration go through the same pipeline as a normal animation.
		animate(entry.element, entry.props, { duration: 0, fill: 'forwards' });
	};

	const reportError = (err: unknown): void => {
		// Match the WAAPI behaviour: callback errors should not break the timeline.
		queueMicrotask(() => {
			throw err;
		});
	};

	// -------------------------------------------------------------------------
	// Auto-play scheduling
	// -------------------------------------------------------------------------

	// We defer auto-play to a microtask so the caller can finish chaining
	// `.add(...).add(...)` synchronously before anything starts.
	let autoPlayScheduled = false;
	const scheduleAutoPlay = (): void => {
		if (paused || autoPlayScheduled || materialized || !isBrowser()) return;
		autoPlayScheduled = true;
		queueMicrotask(() => {
			if (!materialized && !cancelled) materialize();
		});
	};

	// -------------------------------------------------------------------------
	// Builder methods
	// -------------------------------------------------------------------------

	const pushEntry = (entry: Entry): Timeline => {
		entries.push(entry);
		updateAnchor(entry);
		scheduleAutoPlay();
		return api;
	};

	// Guard against post-materialization mutation, then resolve the entry's
	// start time. Shared opening step of every builder method.
	const resolveStart = (op: string, position: TimelinePosition): number => {
		ensureNotMaterialized(op);
		return resolvePosition(position, anchor);
	};

	const add: Timeline['add'] = (element, props, options, position) => {
		const start = resolveStart('add', position);
		const merged = options ? { ...animateDefaults, ...options } : animateDefaults;
		const length = computeAnimateDuration(element, props, merged);
		return pushEntry({
			kind: 'animate',
			start,
			end: start + length,
			element,
			props,
			options: merged
		});
	};

	const setEntry: Timeline['set'] = (element, props, position) => {
		const start = resolveStart('set', position);
		return pushEntry({ kind: 'set', start, end: start, element, props });
	};

	const call: Timeline['call'] = (callback, position) => {
		const start = resolveStart('call', position);
		return pushEntry({ kind: 'call', start, end: start, callback });
	};

	const label: Timeline['label'] = (name, position) => {
		labels.set(name, resolveStart('label', position));
		return api;
	};

	// -------------------------------------------------------------------------
	// Playback controls
	// -------------------------------------------------------------------------

	const forEachCtrl = (fn: (c: AnimationController) => void): void => {
		for (const ctrl of controllers) fn(ctrl);
	};

	// Materialize the timeline (so paused/seeked timelines stay inspectable for
	// duration/animations), apply `op` to every controller, then return the
	// chainable api. Shared by pause/reverse/seek.
	const materializeThen = (op: (c: AnimationController) => void): Timeline => {
		materialize();
		forEachCtrl(op);
		return api;
	};

	const play: Timeline['play'] = () => {
		if (cancelled) return api;
		if (!materialized) {
			materialize();
		} else {
			forEachCtrl((c) => c.play());
		}
		return api;
	};

	const pause: Timeline['pause'] = () => materializeThen((c) => c.pause());

	const reverse: Timeline['reverse'] = () => materializeThen((c) => c.reverse());

	const shutdown = (op: (c: AnimationController) => void): void => {
		cancelled = true;
		forEachCtrl(op);
	};

	const cancel: Timeline['cancel'] = () => shutdown((c) => c.cancel());
	const stop: Timeline['stop'] = () => shutdown((c) => c.stop());

	const seek: Timeline['seek'] = (timeMs) => materializeThen((c) => c.seek(timeMs));

	// Pre-materialization rate is stored and applied to each animation on materialize.
	let pendingPlaybackRate: number | undefined;

	const setPlaybackRate: Timeline['setPlaybackRate'] = (rate) => {
		if (materialized) {
			forEachCtrl((c) => (c.playbackRate = rate));
		} else {
			pendingPlaybackRate = rate;
		}
		return api;
	};

	// -------------------------------------------------------------------------
	// Aggregate `finished`
	// -------------------------------------------------------------------------

	const buildFinished = (): Promise<void> => {
		materialize();
		if (controllers.length === 0) return Promise.resolve();
		return Promise.all(controllers.map((c) => c.finished)).then(() => {});
	};

	const api: Timeline = {
		add,
		set: setEntry,
		call,
		label,
		get duration() {
			return anchor.duration;
		},
		get animations() {
			materialize();
			return cachedAnimations ?? EMPTY_ANIMATIONS;
		},
		get finished() {
			return (finishedPromise ??= buildFinished());
		},
		get labels() {
			return labels;
		},
		play,
		pause,
		reverse,
		cancel,
		stop,
		seek,
		setPlaybackRate
	};

	return api;
};
