/**
 * SVG "draw-on" helper — animate a stroked path so it appears to be drawn.
 *
 * Sets `stroke-dasharray` to the path's total length and animates
 * `stroke-dashoffset` from the hidden state to the drawn state. Works on any
 * `SVGGeometryElement` (`<path>`, `<line>`, `<polyline>`, `<circle>`, …).
 *
 * @example
 * ```ts
 * // Draw a path on over 1s:
 * draw(pathEl, { duration: 1000 });
 *
 * // Erase it (draw out):
 * draw(pathEl, { from: 1, to: 0 });
 *
 * // Draw the middle 60% only, from the opposite end:
 * draw(pathEl, { from: 0.2, to: 0.8, reverse: true });
 * ```
 */

import { animate } from './core/animate';
import { isBrowser } from '../shared/browser';
import { noopController } from './core/controller';
import type { AnimateDefaults, AnimationController } from './types';

export interface DrawOptions extends AnimateDefaults {
	/** Fraction of the path drawn at the start (`0` = hidden, `1` = full). Default 0. */
	from?: number;
	/** Fraction of the path drawn at the end. Default 1. */
	to?: number;
	/** Draw from the path's end point instead of its start. Default false. */
	reverse?: boolean;
}

/** Any SVG element exposing `getTotalLength()` (path, line, polyline, …). */
type GeometryElement = SVGElement & { getTotalLength(): number };

const hasLength = (el: SVGElement): el is GeometryElement =>
	typeof (el as GeometryElement).getTotalLength === 'function';

/**
 * Animate the "draw-on" of an SVG geometry element. Returns the underlying
 * {@link AnimationController} (a no-op controller in SSR or for elements
 * without measurable length).
 */
export const draw = (element: SVGElement, options: DrawOptions = {}): AnimationController => {
	const { from = 0, to = 1, reverse = false, ...defaults } = options;
	if (!isBrowser() || !hasLength(element)) {
		return noopController(element, defaults);
	}
	const length = element.getTotalLength();
	// dashoffset = length at fraction 0 (fully hidden) → 0 at fraction 1 (drawn).
	// Negating the sign draws from the opposite end of the path.
	const dir = reverse ? -1 : 1;
	const offset = (fraction: number): number => dir * length * (1 - fraction);
	element.style.strokeDasharray = String(length);
	return animate(element, { strokeDashoffset: [offset(from), offset(to)] }, defaults);
};
