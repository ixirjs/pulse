/**
 * `morph()` — animate an SVG `<path>` from one shape to another by tweening its
 * `d` attribute. WAAPI can't interpolate `d` across arbitrary command lists, so
 * this normalizes both paths to aligned cubic béziers (see `interpolate.ts`) and
 * runs its own rAF loop.
 *
 * Best results when both paths have the same number of subpaths; when they
 * don't, the morph snaps to the target (same philosophy as `animateGradient`).
 *
 * @example
 * ```ts
 * const heart = 'M12 21 C ...';
 * const star  = 'M12 2 L ...';
 * morph(pathEl, heart, star, { duration: 600 });
 * ```
 */

import { isBrowser, shouldReduceMotion } from '$lib/shared/browser';
import { easeOut } from '$lib/easing';
import type { EasingFn } from '$lib/shared/types';
import { interpolatePlan, planMorph } from './interpolate';

export interface MorphOptions {
	/** Duration in ms. Default 400. */
	duration?: number;
	/** Easing function. Default ease-out. */
	easing?: EasingFn;
	/** Delay before starting (ms). Default 0. */
	delay?: number;
	/** Honor `prefers-reduced-motion` (snap to target). Default true. */
	respectReducedMotion?: boolean;
	/**
	 * Rotate/reverse closed subpaths to minimize anchor travel so the morph
	 * takes the shortest path instead of twisting. Default true.
	 */
	optimize?: boolean;
	/** Called once when the morph settles. */
	onComplete?: () => void;
}

export interface MorphController {
	/** Resolves when the morph settles (or is cancelled). */
	readonly finished: Promise<void>;
	/** Stop the morph where it is. */
	cancel(): void;
}

/** Morph `element`'s `d` from one path string to another. */
export const morph = (
	element: SVGPathElement,
	from: string,
	to: string,
	options: MorphOptions = {}
): MorphController => {
	const {
		duration = 400,
		easing = easeOut,
		delay = 0,
		respectReducedMotion,
		optimize = true,
		onComplete
	} = options;

	let resolveFinished!: () => void;
	const finished = new Promise<void>((res) => (resolveFinished = res));
	const setD = (d: string): void => element.setAttribute('d', d);

	if (!isBrowser() || shouldReduceMotion(respectReducedMotion)) {
		setD(to);
		onComplete?.();
		resolveFinished();
		return { finished, cancel: () => {} };
	}

	const plan = planMorph(from, to, optimize);
	if (!plan.compatible) {
		setD(to);
		onComplete?.();
		resolveFinished();
		return { finished, cancel: () => {} };
	}

	let frame: number | null = null;
	let startTime = 0;
	let done = false;

	const finish = (): void => {
		if (done) return;
		done = true;
		if (frame != null) cancelAnimationFrame(frame);
		frame = null;
		resolveFinished();
	};

	const tick = (now: number): void => {
		if (!startTime) startTime = now + delay;
		const elapsed = now - startTime;
		if (elapsed < 0) {
			frame = requestAnimationFrame(tick);
			return;
		}
		const t = duration <= 0 ? 1 : Math.min(elapsed / duration, 1);
		setD(interpolatePlan(plan, easing(t)));
		if (t >= 1) {
			onComplete?.();
			finish();
		} else {
			frame = requestAnimationFrame(tick);
		}
	};

	setD(interpolatePlan(plan, 0));
	frame = requestAnimationFrame(tick);

	return { finished, cancel: finish };
};
