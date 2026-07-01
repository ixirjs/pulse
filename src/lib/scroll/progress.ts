/**
 * Pure scroll-progress math, separated from the DOM-driving code so it can be
 * unit-tested without a browser. All functions return a normalized `[0, 1]`
 * progress value.
 */

import { clamp01 } from '$lib/shared/math';

/** Whole-scroller progress: how far the scroll position has travelled. */
export const pageProgress = (scroll: number, scrollSize: number, viewport: number): number =>
	clamp01(scroll / (scrollSize - viewport || 1));

/**
 * "Cover" progress of an element through the viewport along one axis.
 *
 * `0` when the element's leading edge first touches the trailing edge of the
 * viewport (about to enter), `1` once its trailing edge has passed the leading
 * edge of the viewport (fully gone). This is the most common scroll-link range
 * and mirrors a `ViewTimeline` with the default `cover` range.
 *
 * @param elementStart Element offset along the axis, in scroll coordinates.
 * @param elementSize  Element size along the axis.
 * @param viewport     Viewport size along the axis.
 * @param scroll       Current scroll offset along the axis.
 */
export const coverProgress = (
	elementStart: number,
	elementSize: number,
	viewport: number,
	scroll: number
): number => {
	const enter = elementStart - viewport;
	const leave = elementStart + elementSize;
	return clamp01((scroll - enter) / (leave - enter || 1));
};

/**
 * "Contain" progress: `0` when the element is fully scrolled into view at the
 * leading edge, `1` when it begins to leave at the trailing edge. Only the span
 * where the whole element is (or could be) visible is mapped.
 */
export const containProgress = (
	elementStart: number,
	elementSize: number,
	viewport: number,
	scroll: number
): number => {
	const enter = elementStart - viewport + elementSize;
	const leave = elementStart;
	return clamp01((scroll - enter) / (leave - enter || 1));
};
