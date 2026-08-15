import type { EasingFn } from '../shared/types';
import { cubicBezier } from './cubic-bezier';
import { linear } from './primitive';

/**
 * Tag an easing with the CSS keyword it is exactly equivalent to, so
 * `easingToCss` can emit the keyword the browser implements natively instead of
 * resampling it into a `linear(…)` approximation. Mirrors how `springEasing`
 * carries its own `_linearEasing`.
 */
const keyword = (name: string, fn: EasingFn): EasingFn => Object.assign(fn, { _cssKeyword: name });

/** The CSS keyword an easing is exactly equivalent to, if it has one. */
export const cssKeywordOf = (fn: EasingFn): string | undefined =>
	(fn as { _cssKeyword?: string })._cssKeyword;

/** Equivalent to CSS `ease`. */
export const ease: EasingFn = keyword('ease', cubicBezier(0.25, 0.1, 0.25, 1));
/** Equivalent to CSS `ease-in`. */
export const easeIn: EasingFn = keyword('ease-in', cubicBezier(0.42, 0, 1, 1));
/** Equivalent to CSS `ease-out`. */
export const easeOut: EasingFn = keyword('ease-out', cubicBezier(0, 0, 0.58, 1));
/** Equivalent to CSS `ease-in-out`. */
export const easeInOut: EasingFn = keyword('ease-in-out', cubicBezier(0.42, 0, 0.58, 1));

/**
 * Map the CSS easing keyword strings (`"ease"`, `"ease-in-out"`, …) to their
 * easing-function equivalents — the single source of truth for resolving a CSS
 * easing name to a callable easing.
 */
export const CSS_EASINGS: Readonly<Record<string, EasingFn>> = {
	linear,
	ease,
	'ease-in': easeIn,
	'ease-out': easeOut,
	'ease-in-out': easeInOut
};
