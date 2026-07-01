/**
 * Gradient interpolation — tween between CSS `linear-gradient` backgrounds,
 * which WAAPI cannot animate natively.
 */

export { animateGradient } from './gradient';
export type { GradientOptions, GradientController } from './gradient';
export { parseLinearGradient, formatLinearGradient, parseRGBA, lerpRGBA } from './parse';
export type { RGBA, LinearGradient, GradientStop } from './parse';
