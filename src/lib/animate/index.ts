/**
 * Public entry point for the `animate()` library.
 *
 * Implementation lives in sibling modules; this file only re-exports.
 */

export { animate } from './core/animate';
export { timeline } from './timeline/timeline';
export type { Timeline, TimelineDefaults, TimelinePosition } from './timeline/timeline';
export { spring } from '../shared/spring-core';
export type { SpringSamples as Spring } from '../shared/spring-core';
export { cubicBezier, springEasing } from '../easing';
export type { SpringEasingFn } from '../easing';
export * as easings from '../easing';
export { stagger } from './stagger';
export type { StaggerOptions } from './stagger';

export { motionPath } from './motion-path';
export type { MotionPathOptions } from './motion-path';
export { draw } from './draw';
export type { DrawOptions } from './draw';
export { createSpringValue } from './spring-value';
export type { SpringValue, SpringValueOptions } from './spring-value';
export { animateValue, countUp } from './animate-value';
export type { AnimateValueOptions, CountUpOptions, ValueController } from './animate-value';

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
} from './types';
