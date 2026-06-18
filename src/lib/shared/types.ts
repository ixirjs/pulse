/**
 * Easing must be a pure function of `t ∈ [0, 1]` returning normalized
 * progress (typically `[0, 1]`, may overshoot for back/elastic curves).
 */
export type EasingFn = (t: number) => number;

/**
 * An element this library can animate. Both `HTMLElement` and `SVGElement`
 * expose `.style` and `getBoundingClientRect()`, which is all the runtime needs.
 */
export type MotionElement = HTMLElement | SVGElement;

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
