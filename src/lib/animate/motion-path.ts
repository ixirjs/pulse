/**
 * CSS Motion Path helper — move an element along an arbitrary path by
 * animating the natively-interpolated `offset-distance` property.
 *
 * `offset-path` itself is not animatable (it defines the track), so this
 * helper wires it as an inline style and drives `offsetDistance` from a start
 * to an end position. Auto-rotation along the path is on by default.
 *
 * @example
 * ```ts
 * // Travel the full path, rotating to face the direction of travel:
 * motionPath(node, 'M0,0 C 50,-80 150,80 200,0', { duration: 1200 });
 *
 * // Partway along, no rotation, springy:
 * motionPath(node, 'circle(80px at 50% 50%)', {
 *   from: 0, to: 50, rotate: false, spring: { stiffness: 120 },
 * });
 * ```
 */

import { animate } from './core/animate';
import type { AnimateDefaults, AnimationController, MotionElement } from './types';

export interface MotionPathOptions extends AnimateDefaults {
	/** Start position along the path. Number → percent (`0` = path start). Default 0. */
	from?: number | string;
	/** End position along the path. Number → percent (`100` = path end). Default 100. */
	to?: number | string;
	/**
	 * Auto-rotate the element to face along the path. `true` → `auto`,
	 * `false` → no rotation, or pass any `offset-rotate` value (e.g. `"auto 90deg"`).
	 * Default `true`.
	 */
	rotate?: boolean | string;
	/** `offset-anchor` value (the element point pinned to the path). */
	anchor?: string;
}

/** Coerce a numeric distance to a percentage; pass strings through verbatim. */
const toDistance = (v: number | string): string => (typeof v === 'number' ? `${v}%` : v);

/**
 * Normalize a path argument into a valid `offset-path` value. A bare SVG path
 * string (`"M0,0 L10,10"`) is wrapped in `path(...)`; anything already
 * containing a function (`path(...)`, `ray(...)`, `circle(...)`, `url(...)`)
 * is used as-is.
 */
const toOffsetPath = (path: string): string => (path.includes('(') ? path : `path('${path}')`);

const resolveRotate = (rotate: boolean | string): string =>
	rotate === true ? 'auto' : rotate === false ? '0deg' : rotate;

/**
 * Animate `element` along `path` by interpolating `offset-distance`.
 * Returns the underlying {@link AnimationController}.
 */
export const motionPath = (
	element: MotionElement,
	path: string,
	options: MotionPathOptions = {}
): AnimationController => {
	const { from = 0, to = 100, rotate = true, anchor, ...defaults } = options;
	const style = element.style;
	style.setProperty('offset-path', toOffsetPath(path));
	style.setProperty('offset-rotate', resolveRotate(rotate));
	if (anchor != null) style.setProperty('offset-anchor', anchor);
	return animate(element, { offsetDistance: [toDistance(from), toDistance(to)] }, defaults);
};
