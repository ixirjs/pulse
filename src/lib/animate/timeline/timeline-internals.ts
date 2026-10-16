/**
 * Internal entry shapes and planning helpers for `timeline()`.
 *
 * Kept separate from the timeline runner so that planning logic (duration
 * estimation, offset injection) can be read and tested in isolation from the
 * stateful materialization machinery.
 */

import type {
	AnimatableValue,
	AnimateDefaults,
	AnimateProps,
	MotionElement,
	PropInput
} from '../types.js';
import { isPropConfig, normalizeInput, resolveTiming, tupleToConfig } from '../keyframes/normalize.js';

// ---------------------------------------------------------------------------
// Entry shapes
// ---------------------------------------------------------------------------

interface BaseEntry {
	start: number;
	end: number;
}

interface ElementEntry extends BaseEntry {
	element: MotionElement;
	props: AnimateProps;
}

interface AnimateEntry extends ElementEntry {
	readonly kind: 'animate';
	options: AnimateDefaults;
}

export interface SetEntry extends ElementEntry {
	readonly kind: 'set';
}

interface CallEntry extends BaseEntry {
	readonly kind: 'call';
	callback: () => void;
}

export type Entry = AnimateEntry | SetEntry | CallEntry;

// ---------------------------------------------------------------------------
// Duration estimation
// ---------------------------------------------------------------------------

/**
 * Compute the total time an `animate()` call will occupy — the largest
 * `(delay + duration × iterations)` across its props. Spring durations are auto-sized
 * via the same `resolveTiming()` the runtime uses, so the value is exact.
 */
export const computeAnimateDuration = (
	element: MotionElement,
	props: AnimateProps,
	defaults: AnimateDefaults
): number => {
	// Every prop shares the effect-level iteration count; `Infinity` propagates,
	// so a looping entry pushes later relative positions out to infinity too.
	const iterations = defaults.iterations ?? 1;
	let max = 0;
	for (const key of Object.keys(props)) {
		const config = normalizeInput(props[key]!, defaults, key);
		const t = resolveTiming(config, element);
		// `duration > 0` guard: 0 × Infinity would poison the max with NaN.
		max = Math.max(max, t.delay + (t.duration > 0 ? t.duration * iterations : 0));
	}
	return max;
};

// ---------------------------------------------------------------------------
// Offset injection
// ---------------------------------------------------------------------------

/**
 * Wrap each prop input into a `PropConfig` whose `delay` includes the
 * timeline offset. We don't push the offset onto `defaults.delay` because
 * per-prop `delay` would override it — losing the offset for any prop with
 * its own delay value.
 */
export const offsetProps = (
	props: AnimateProps,
	defaults: AnimateDefaults,
	offset: number
): AnimateProps => {
	if (offset === 0) return props;
	const baseDelay = (defaults.delay ?? 0) + offset;
	const out: Record<string, PropInput> = {};
	for (const key of Object.keys(props)) {
		const raw = props[key]!;
		if (Array.isArray(raw)) {
			out[key] = { ...tupleToConfig(raw), delay: baseDelay };
		} else if (isPropConfig(raw)) {
			out[key] = { ...raw, delay: (raw.delay ?? defaults.delay ?? 0) + offset };
		} else {
			out[key] = { to: raw as AnimatableValue, delay: baseDelay };
		}
	}
	return out;
};
