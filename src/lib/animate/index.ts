/**
 * Public entry point for the `animate()` library.
 *
 * Implementation lives in sibling modules; this file only re-exports.
 */

export { animate } from "./core/animate";
export { timeline } from "./timeline/timeline";
export type { Timeline, TimelineDefaults, TimelinePosition } from "./timeline/timeline";
export { spring } from "./spring";
export type { Spring } from "./spring";
export { cubicBezier, springEasing } from "../easing";
export type { SpringEasingFn } from "../easing";
export * as easings from "../easing";
export { stagger } from "./stagger";
export type { StaggerOptions } from "./stagger";

export { flipFromRect, flipToRect, captureRect } from "./flip";
export type { FlipRect as AnimateFlipRect } from "./flip";

export type {
  AnimatableValue,
  AnimateDefaults,
  AnimateProps,
  AnimationController,
  Easing,
  EasingFn,
  PlaybackDirection,
  PropConfig,
  PropInput,
  SpringInput,
  SpringOptions,
} from "./types";
