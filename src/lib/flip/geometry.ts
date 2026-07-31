/**
 * FLIP geometry — rect capture and delta math. The single source of truth for
 * which way a FLIP moves; the animator and every attachment route through it,
 * so no two call sites can disagree on direction.
 *
 * Only `measure` / `measureVisual` touch the DOM (read-only); everything else
 * is pure.
 */

import { measureWithoutAncestorTransforms } from '../animate/properties/properties';
import type { AnimateProps } from '../animate/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Axis-aligned bounding rectangle in viewport coordinates. */
export interface FlipRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** A pair of rects describing a layout change (`from` → `to`). */
export interface FlipRectPair {
	from: FlipRect;
	to: FlipRect;
}

export interface FlipDelta {
	/** Horizontal translate component (`from.x - to.x`). */
	dx: number;
	/** Vertical translate component (`from.y - to.y`). */
	dy: number;
	/** Horizontal scale component (`from.width / to.width`). */
	sx: number;
	/** Vertical scale component (`from.height / to.height`). */
	sy: number;
}

interface DeltaOptions {
	translate?: boolean;
	scale?: boolean;
}

export const DEFAULT_DURATION = 280;

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

/** Read the element's layout rect, suppressing any in-flight motion transforms. */
export const measure = (element: Element): FlipRect => {
	const { left: x, top: y, width, height } = measureWithoutAncestorTransforms(element);
	return { x, y, width, height };
};

/**
 * Read the element's current *visual* rect — its own in-flight motion
 * transform included, ancestor transforms still suppressed. Use this as the
 * `from` rect when interrupting an in-flight FLIP so the replacement animation
 * starts exactly where the element is on-screen, instead of snapping to its
 * resting layout box first.
 */
export const measureVisual = (element: Element): FlipRect => {
	const {
		left: x,
		top: y,
		width,
		height
	} = measureWithoutAncestorTransforms(element, { suppressSelf: false });
	return { x, y, width, height };
};

/** Approximate equality so sub-pixel jitter doesn't trigger reflows. */
export const rectsEqual = (a: FlipRect, b: FlipRect, epsilon = 0.5): boolean =>
	Math.abs(a.x - b.x) < epsilon &&
	Math.abs(a.y - b.y) < epsilon &&
	Math.abs(a.width - b.width) < epsilon &&
	Math.abs(a.height - b.height) < epsilon;

/** Diagonal distance between two rects' top-left corners. */
export const diagonal = (a: FlipRect, b: FlipRect): number =>
	Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

// ---------------------------------------------------------------------------
// Delta math
// ---------------------------------------------------------------------------

/**
 * Compute the inverted transform that places the element back at `from`.
 * Components disabled in `opts` resolve to their identity.
 */
const computeDelta = (
	{ from, to }: FlipRectPair,
	{ translate = true, scale = true }: DeltaOptions = {}
): FlipDelta => ({
	dx: translate ? from.x - to.x : 0,
	dy: translate ? from.y - to.y : 0,
	sx: scale && to.width > 0 ? from.width / to.width : 1,
	sy: scale && to.height > 0 ? from.height / to.height : 1
});

/** True when the delta would produce no visible movement. */
export const isIdentityDelta = (delta: FlipDelta): boolean =>
	delta.dx === 0 && delta.dy === 0 && delta.sx === 1 && delta.sy === 1;

/**
 * Resolve the FLIP delta for a layout change, honoring direction.
 *
 * Inverse (`forward: false`): DOM is at `to`; the delta is the inverse
 * transform `(from − to)` that places the element back at `from`.
 * Forward (`forward: true`): DOM is at `from`; the rect pair is swapped so the
 * delta becomes `(to − from)`, driving the element visually toward `to`.
 */
export const resolveFlipDelta = (
	from: FlipRect,
	to: FlipRect,
	forward: boolean,
	opts?: DeltaOptions
): FlipDelta => computeDelta(forward ? { from: to, to: from } : { from, to }, opts);

/**
 * Build the `animate()` props object for a FLIP delta.
 *
 * Inverse (default): DOM is at `to`; apply `[Δ→0]` to start visually at `from`.
 * Forward: DOM is at `from`; apply `[0→Δ]` to drive visually toward `to`.
 */
export const buildFlipProps = ({ dx, dy, sx, sy }: FlipDelta, forward: boolean): AnimateProps => {
	// `pair` orders the [from, to] keyframe by direction; `translate`/`scale`
	// capture each component's unit and identity so they live in one place.
	const pair = (delta: string, identity: string): [string, string] =>
		forward ? [identity, delta] : [delta, identity];
	const translate = (v: number): [string, string] => pair(`${v}px`, '0px');
	const scale = (v: number): [string, string] => pair(`${v}`, '1');
	return {
		flipX: translate(dx),
		flipY: translate(dy),
		flipScaleX: scale(sx),
		flipScaleY: scale(sy)
	};
};
