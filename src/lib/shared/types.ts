/**
 * Easing must be a pure function of `t ∈ [0, 1]` returning normalized
 * progress (typically `[0, 1]`, may overshoot for back/elastic curves).
 */
export type EasingFn = (t: number) => number;
