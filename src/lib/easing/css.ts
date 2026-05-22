import type { EasingFn } from '../animate/types';
import { cubicBezier } from './cubic-bezier';

/** Equivalent to CSS `ease`. */
export const ease: EasingFn = cubicBezier(0.25, 0.1, 0.25, 1);
/** Equivalent to CSS `ease-in`. */
export const easeIn: EasingFn = cubicBezier(0.42, 0, 1, 1);
/** Equivalent to CSS `ease-out`. */
export const easeOut: EasingFn = cubicBezier(0, 0, 0.58, 1);
/** Equivalent to CSS `ease-in-out`. */
export const easeInOut: EasingFn = cubicBezier(0.42, 0, 0.58, 1);
