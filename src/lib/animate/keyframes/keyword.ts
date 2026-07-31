/**
 * Intrinsic-size keyword handling for `animate()`.
 *
 * CSS properties like `width`, `max-width`, and `height` accept keyword values
 * (`auto`, `fit-content`, `min-content`, …) that are not directly animatable
 * by WAAPI. These helpers detect such keywords and measure their resolved pixel
 * value so `animate()` can use a concrete `[from, to]` pair as keyframe
 * endpoints — then restore the keyword once the animation finishes so the
 * element stays responsive to layout changes.
 */

import type { PropDef } from '../properties/properties';
import type { AnimatableValue, MotionElement } from '../types';
import { isBrowser } from '../../shared/browser';
import { restoreStyleProp, saveStyleProp } from '../../shared/inline-style';

const AUTO_KEYWORDS = new Set([
	'auto',
	'fit-content',
	'min-content',
	'max-content',
	'intrinsic',
	// Sizing keywords with varying browser/spec support.
	'stretch',
	'available',
	'-webkit-fill-available',
	'-moz-available'
]);

/** Returns `true` when `value` is an intrinsic-size keyword like `auto`. */
export const isAutoKeyword = (value: AnimatableValue | undefined): value is string => {
	if (typeof value !== 'string') return false;
	const v = value.trim().toLowerCase();
	return AUTO_KEYWORDS.has(v) || v.startsWith('fit-content(');
};

/**
 * Temporarily apply `keyword` to `def.css`, force layout, then read back the
 * resolved pixel value so it can be used as a concrete keyframe endpoint.
 * The element's prior inline value is restored before returning.
 *
 * Measurement strategies:
 * 1. `width` / `height` — `getBoundingClientRect()` always resolves to px.
 * 2. Properties with `sizeDimension` (e.g. `max-width`, `min-height`) — try
 *    `getComputedStyle` first; fall back to the bounding rect if the browser
 *    preserves the keyword rather than resolving it.
 * 3. All others — `getComputedStyle` only, no bounding-rect fallback.
 */
export const measureKeywordValue = (
	element: MotionElement,
	def: PropDef,
	keyword: string
): string => {
	if (!isBrowser()) return def.initial;
	const style = element.style;
	const saved = saveStyleProp(style, def.css);

	style.setProperty(def.css, keyword);

	let measured: string;
	if (def.css === 'width' || def.css === 'height') {
		measured = `${element.getBoundingClientRect()[def.css]}px`;
	} else {
		const css = window.getComputedStyle(element).getPropertyValue(def.css).trim();
		if (css && css !== keyword) {
			measured = css;
		} else if (def.sizeDimension) {
			measured = `${element.getBoundingClientRect()[def.sizeDimension]}px`;
		} else {
			measured = '0px';
		}
	}

	restoreStyleProp(style, def.css, saved);

	return measured;
};
