/**
 * Public entry point for the `animate()` library.
 *
 * Implementation lives in sibling modules; this file only re-exports.
 */

export { animate } from './core/animate.js';
export { timeline } from './timeline/timeline.js';
export type { Timeline, TimelineDefaults, TimelinePosition } from './timeline/timeline.js';
export { spring } from '../shared/spring-core.js';
export type { SpringSamples as Spring } from '../shared/spring-core.js';
export { cubicBezier, springEasing } from '../easing/index.js';
export type { SpringEasingFn } from '../easing/index.js';
export * as easings from '../easing/index.js';
export { stagger } from './stagger.js';
export type { StaggerOptions } from './stagger.js';

export { motionPath } from './motion-path.js';
export type { MotionPathOptions } from './motion-path.js';
export { draw } from './draw.js';
export type { DrawOptions } from './draw.js';
export { createSpringValue } from './spring-value.js';
export type { SpringValue, SpringValueOptions } from './spring-value.js';
export { animateValue, countUp } from './animate-value.js';
export type { AnimateValueOptions, CountUpOptions, ValueController } from './animate-value.js';

export type {
	AnimatableValue,
	AnimateDefaults,
	AnimateProps,
	AnimationController,
	Easing,
	EasingFn,
	MotionElement,
	PlaybackDirection,
	PropConfig,
	PropInput,
	SpringInput,
	SpringOptions
} from './types.js';
