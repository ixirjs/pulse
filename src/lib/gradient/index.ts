/**
 * Gradient interpolation — tween between CSS `linear-gradient` backgrounds,
 * which WAAPI cannot animate natively.
 */

export { animateGradient } from './gradient.js';
export type { GradientOptions, GradientController } from './gradient.js';
export { parseLinearGradient, formatLinearGradient, parseRGBA, lerpRGBA } from './parse.js';
export type { RGBA, LinearGradient, GradientStop } from './parse.js';
