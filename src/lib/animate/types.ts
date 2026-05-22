/**
 * Public types for the `animate()` library.
 */

import type { EasingFn } from "$lib/shared/types";

export type { EasingFn };

/**
 * Easing must be a pure function of `t ∈ [0, 1]` returning normalized
 * progress (typically `[0, 1]`, may overshoot for back/elastic curves).
 *
 * Import ready-made easings from `@parinvo/shared/.../animate/easings`.
 */
export type Easing = EasingFn;

/** WAAPI playback direction. */
export type PlaybackDirection = "normal" | "reverse" | "alternate" | "alternate-reverse";

export type AnimatableValue = number | string;

/**
 * A duration value in ms, or a function that receives the element being
 * animated and returns a duration in ms. Useful for distance- or
 * size-based timing (e.g. longer travel = longer animation).
 *
 * @example
 * ```ts
 * // Faster for small elements, slower for large ones:
 * animate(el, { x: 200 }, { duration: (el) => el.offsetWidth * 0.8 });
 * ```
 */
export type DurationFn = (element: HTMLElement | SVGElement) => number;

export interface SpringOptions {
  /** Stiffness of the spring (k). Default: 170. */
  stiffness?: number;
  /** Damping coefficient (c). Default: 26. */
  damping?: number;
  /** Mass of the body (m). Default: 1. */
  mass?: number;
  /** Initial velocity in target-units / second. Default: 0. */
  velocity?: number;
  /** Position delta below which the spring is considered at rest. Default: 0.001. */
  restDelta?: number;
  /** Velocity below which the spring is considered at rest. Default: 0.001. */
  restSpeed?: number;
}

export type SpringInput = SpringOptions | true;

/**
 * Per-property configuration. Available shorthands:
 *  - `number | string`           → animate to this value (from = current)
 *  - `[from, to]`                → animate between the two literal values
 *  - `PropConfig`                → full per-prop configuration
 */
export interface PropConfig {
  from?: AnimatableValue;
  to: AnimatableValue;
  duration?: number | DurationFn;
  easing?: Easing;
  spring?: SpringInput;
  delay?: number;
}

export type PropInput =
  | AnimatableValue
  | readonly [AnimatableValue, AnimatableValue]
  | PropConfig;

export interface AnimateDefaults {
  /** Default duration in ms, or a function of the element, when neither `duration` nor `spring` is set. Default: 300. */
  duration?: number | DurationFn;
  /** Default easing for non-spring props. Default: `ease-out`. */
  easing?: Easing;
  /** Default spring config (overridden per-prop). */
  spring?: SpringInput;
  /** Delay applied to all props (overridden per-prop). */
  delay?: number;
  /** WAAPI fill mode. Default: `both`. */
  fill?: FillMode;
  /** WAAPI composite operation. Default: `replace`. */
  composite?: CompositeOperation;
  /**
   * Number of times each animation repeats. Use `Infinity` for looping.
   * Default: 1.
   */
  iterations?: number;
  /**
   * Playback direction for each iteration. Combine with `iterations` to
   * alternate (e.g. ping-pong: `{ iterations: Infinity, direction: 'alternate' }`).
   * Default: `'normal'`.
   */
  direction?: PlaybackDirection;
  /**
   * Fraction of the iteration at which to begin playback (`0` = iteration
   * start, `0.5` = midpoint). Default: 0.
   */
  iterationStart?: number;
  /**
   * Initial playback rate. Values `> 1` speed up, `< 1` slow down, negative
   * values play in reverse from the fill end-state. Default: 1.
   */
  playbackRate?: number;
  /** Honor `prefers-reduced-motion`. Default: `true`. */
  respectReducedMotion?: boolean;
  /** Called once when the first underlying animation starts. */
  onStart?: (el: Element) => void;
  /** Called once after every underlying animation has settled. */
  onEnd?: (el: Element, info: { finished: boolean }) => void;
}

export type AnimateProps = Record<string, PropInput>;

export interface AnimationController {
  /** All underlying WAAPI animations. */
  readonly animations: readonly Animation[];
  /** Resolves when every underlying animation finishes (or rejects on cancel). */
  readonly finished: Promise<void>;
  /**
   * Current playback position in ms from the animation start, or `null`
   * before any frame has been committed.
   */
  readonly currentTime: number | null;
  /** Current playback rate (1 = normal speed, -1 = reverse, etc.). */
  playbackRate: number;
  cancel(): void;
  /**
   * Commit the current in-flight animated values as inline styles, then
   * cancel. Use this instead of `cancel()` when you need to interrupt an
   * animation mid-flight and start a new one from the same position —
   * e.g. in an `{@attach}` cleanup — so the next animation's `from` value
   * is the actual current position rather than snapping back.
   */
  stop(): void;
  pause(): void;
  play(): void;
  reverse(): void;
  /**
   * Seek all underlying animations to `timeMs` from the animation start.
   * Equivalent to setting `currentTime` on every underlying `Animation`.
   */
  seek(timeMs: number): void;
}
