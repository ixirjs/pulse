/**
 * A `requestAnimationFrame` number tween with a per-frame `onUpdate` callback.
 *
 * WAAPI animates the compositor and cannot call back into JS each frame, so it
 * can't drive arbitrary values — counters, canvas coordinates, SVG attributes,
 * plain JS numbers. `animateValue()` fills that gap: a tiny rAF loop that
 * interpolates `from → to` through the *same* easing engine the CSS animations
 * use, calling `onUpdate(value)` on every frame (including the final one).
 *
 * It is framework-agnostic — write the value wherever you like (textContent,
 * a canvas draw call, a Svelte `$state`).
 *
 * @example
 * ```ts
 * // Count a label up to 1000 over 800ms:
 * animateValue(0, 1000, {
 * 	duration: 800,
 * 	round: true,
 * 	onUpdate: (v) => { label.textContent = String(v); }
 * });
 *
 * // Drive a canvas, stop early on interaction:
 * const ctrl = animateValue(0, Math.PI * 2, { onUpdate: (a) => draw(a) });
 * await ctrl.finished;
 * ```
 */

import { isBrowser, shouldReduceMotion } from '$lib/shared/browser';
import { easeOut } from '$lib/easing';
import type { EasingFn } from './types';

/** Default tween duration in ms when none is supplied. */
const DEFAULT_DURATION = 300;

export interface AnimateValueOptions {
	/** Tween duration in ms. Default 300. */
	duration?: number;
	/** Easing curve mapping linear progress → eased progress. Default `easeOut`. */
	easing?: EasingFn;
	/** Delay in ms before the tween begins. Default 0. */
	delay?: number;
	/**
	 * Called each frame with the interpolated value, including the final value
	 * (which is always exactly `to`). Required.
	 */
	onUpdate: (value: number) => void;
	/** Called once after the tween settles (not called if `stop()` interrupts it). */
	onComplete?: () => void;
	/**
	 * Honor `prefers-reduced-motion` (and SSR). When reduced motion is requested
	 * or there is no rAF, the tween jumps straight to `to`. Default true.
	 */
	respectReducedMotion?: boolean;
	/**
	 * Round each emitted value before `onUpdate`. `true` rounds to an integer;
	 * a number N rounds to N decimal places. Common for counters.
	 */
	round?: boolean | number;
}

export interface ValueController {
	/** Cancel the rAF loop. Resolves `finished` without firing `onComplete`. */
	stop(): void;
	/** Resolves when the tween settles or is stopped. */
	readonly finished: Promise<void>;
}

/** Build a rounding fn from the `round` option, or identity when unset. */
const makeRounder = (round?: boolean | number): ((value: number) => number) => {
	if (round === true) return (v) => Math.round(v);
	if (typeof round === 'number') {
		const factor = 10 ** round;
		return (v) => Math.round(v * factor) / factor;
	}
	return (v) => v;
};

/**
 * Tween a single number from `from` to `to`, calling `onUpdate` each frame.
 * Returns a {@link ValueController} to stop it early and await completion.
 *
 * In SSR or under reduced motion (when `respectReducedMotion` is on), the
 * final value is emitted immediately and the returned controller is settled.
 */
export const animateValue = (
	from: number,
	to: number,
	options: AnimateValueOptions
): ValueController => {
	const {
		duration = DEFAULT_DURATION,
		easing = easeOut,
		delay = 0,
		onUpdate,
		onComplete,
		respectReducedMotion = true,
		round
	} = options;

	const emit = makeRounder(round);

	let frame: number | null = null;
	let resolveFinished!: () => void;
	const finished = new Promise<void>((resolve) => (resolveFinished = resolve));

	// SSR, or reduced motion: jump to the end value and settle immediately.
	if (!isBrowser() || shouldReduceMotion(respectReducedMotion)) {
		onUpdate(emit(to));
		onComplete?.();
		resolveFinished();
		return { stop: () => {}, finished };
	}

	const span = to - from;
	const start = performance.now() + delay;

	const tick = (now: number): void => {
		const elapsed = now - start;
		if (elapsed < 0) {
			// Still inside the delay window — keep waiting.
			frame = requestAnimationFrame(tick);
			return;
		}
		const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 1;
		const value = from + span * easing(progress);
		onUpdate(emit(value));

		if (progress >= 1) {
			frame = null;
			onComplete?.();
			resolveFinished();
			return;
		}
		frame = requestAnimationFrame(tick);
	};

	frame = requestAnimationFrame(tick);

	return {
		stop() {
			if (frame != null) {
				cancelAnimationFrame(frame);
				frame = null;
			}
			resolveFinished();
		},
		finished
	};
};

/** Options for {@link countUp}; same as {@link animateValue} but `onUpdate` is supplied. */
export type CountUpOptions = Omit<AnimateValueOptions, 'onUpdate'>;

/** Parse the element's current numeric textContent, falling back to 0. */
const readNumber = (element: HTMLElement): number => {
	const parsed = parseFloat(element.textContent ?? '');
	return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Animate an element's numeric `textContent` from its current value (or 0) up
 * to `to`, writing each frame's value back into `textContent`. A thin wrapper
 * over {@link animateValue}; defaults `round` to integer (override via options).
 *
 * @example
 * ```ts
 * countUp(scoreEl, 9001, { duration: 1200 });
 * ```
 */
export const countUp = (
	element: HTMLElement,
	to: number,
	options: CountUpOptions = {}
): ValueController =>
	animateValue(readNumber(element), to, {
		round: true,
		...options,
		onUpdate: (value) => {
			element.textContent = String(value);
		}
	});
