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

import { isBrowser, shouldReduceMotion } from '../shared/browser';
import { frameTween } from '../shared/frame-tween';
import { easeOut } from '../easing';
import type { EasingFn } from '../shared/types';
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

	const setD = (d: string): void => element.setAttribute('d', d);

	if (!isBrowser() || shouldReduceMotion(respectReducedMotion)) {
		setD(to);
		onComplete?.();
		return { finished: Promise.resolve(), cancel: () => {} };
	}

	const plan = planMorph(from, to, optimize);
	if (!plan.compatible) {
		setD(to);
		onComplete?.();
		return { finished: Promise.resolve(), cancel: () => {} };
	}

	const tween = frameTween({
		duration,
		delay,
		renderInitial: true,
		onFrame: (progress) => setD(interpolatePlan(plan, easing(progress))),
		onComplete
	});

	return { finished: tween.finished, cancel: tween.cancel };
};
