import type { EasingFn } from '$lib/shared/types';
import { cubicBezier } from './cubic-bezier';
import { linear } from './primitive';

/** Equivalent to CSS `ease`. */
export const ease: EasingFn = cubicBezier(0.25, 0.1, 0.25, 1);
/** Equivalent to CSS `ease-in`. */
export const easeIn: EasingFn = cubicBezier(0.42, 0, 1, 1);
/** Equivalent to CSS `ease-out`. */
export const easeOut: EasingFn = cubicBezier(0, 0, 0.58, 1);
/** Equivalent to CSS `ease-in-out`. */
export const easeInOut: EasingFn = cubicBezier(0.42, 0, 0.58, 1);

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
