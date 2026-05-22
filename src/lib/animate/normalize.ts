/**
 * Input normalization and per-prop timing resolution.
 *
 * Splits the user-facing shorthands (`123`, `[from, to]`, `PropConfig`) into
 * a uniform `PropConfig`, then derives the WAAPI timing (duration / easing
 * / delay) — including spring sampling.
 */

import { getCachedSpring } from "./spring";
import type {
  AnimateDefaults,
  DurationFn,
  PropConfig,
  PropInput,
  SpringInput,
  SpringOptions,
} from "./types";
import {
  DEFAULT_DURATION,
  DEFAULT_EASING_CSS,
  easingToCss,
} from "./utils";

export interface ResolvedTiming {
  duration: number;
  easing: string;
  delay: number;
}

const isPropConfig = (input: PropInput): input is PropConfig =>
  typeof input === "object" &&
  input !== null &&
  !Array.isArray(input) &&
  "to" in (input as PropConfig);

const resolveSpring = (input: SpringInput): SpringOptions =>
  input === true ? {} : input;

/**
 * Resolve a `duration` value that may be a plain number or a function of the
 * element. Returns `fallback` when `duration` is undefined.
 */
const resolveDurationMs = (
  duration: number | DurationFn | undefined,
  element: HTMLElement | SVGElement | undefined,
  fallback: number,
): number => {
  if (duration == null) return fallback;
  if (typeof duration === "function") return Math.max(0, duration(element!));
  return duration;
};

export const normalizeInput = (
  input: PropInput,
  defaults: AnimateDefaults,
): PropConfig => {
  if (Array.isArray(input)) {
    return {
      from: input[0],
      to: input[1],
      duration: defaults.duration,
      easing: defaults.easing,
      spring: defaults.spring,
      delay: defaults.delay,
    };
  }
  if (isPropConfig(input)) {
    return {
      from: input.from,
      to: input.to,
      duration: input.duration ?? defaults.duration,
      easing: input.easing ?? defaults.easing,
      spring: input.spring ?? defaults.spring,
      delay: input.delay ?? defaults.delay,
    };
  }
  return {
    to: input as number | string,
    duration: defaults.duration,
    easing: defaults.easing,
    spring: defaults.spring,
    delay: defaults.delay,
  };
};

export const resolveTiming = (config: PropConfig, element?: HTMLElement | SVGElement): ResolvedTiming => {
  if (config.spring) {
    const cached = getCachedSpring(resolveSpring(config.spring));
    return {
      duration: resolveDurationMs(config.duration, element, cached.spring.duration),
      easing: cached.linearEasingCss,
      delay: config.delay ?? 0,
    };
  }
  const easingDuration = (config.easing as { duration?: number } | undefined)?.duration;
  return {
    duration: resolveDurationMs(config.duration, element, easingDuration ?? DEFAULT_DURATION),
    easing: config.easing ? easingToCss(config.easing) : DEFAULT_EASING_CSS,
    delay: config.delay ?? 0,
  };
};
