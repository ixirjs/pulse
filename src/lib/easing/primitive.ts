import type { EasingFn } from '$lib/shared/types';

export const linear: EasingFn = (t) => t;

const pow    = (n: number): EasingFn => (t) => t ** n;
const powOut = (n: number): EasingFn => (t) => 1 - (1 - t) ** n;
const powInOut = (n: number): EasingFn => {
  const c = 2 ** (n - 1);
  return (t) => t < 0.5 ? c * t ** n : 1 - (-2 * t + 2) ** n / 2;
};

/**
 * Pin an easing to exactly 0 at `t = 0` and 1 at `t = 1`. Expo/elastic curves
 * use `2 ** …` terms that don't land precisely on the endpoints, so they share
 * this guard rather than repeating it inline.
 */
const withEndpoints = (fn: EasingFn): EasingFn => (t) =>
  t === 0 ? 0 : t === 1 ? 1 : fn(t);

export const quadIn: EasingFn = pow(2);
export const quadOut: EasingFn = powOut(2);
export const quadInOut: EasingFn = powInOut(2);

export const cubicIn: EasingFn = pow(3);
export const cubicOut: EasingFn = powOut(3);
export const cubicInOut: EasingFn = powInOut(3);

export const quartIn: EasingFn = pow(4);
export const quartOut: EasingFn = powOut(4);
export const quartInOut: EasingFn = powInOut(4);

export const quintIn: EasingFn = pow(5);
export const quintOut: EasingFn = powOut(5);
export const quintInOut: EasingFn = powInOut(5);

export const expoIn: EasingFn = withEndpoints((t) => 2 ** (10 * t - 10));
export const expoOut: EasingFn = withEndpoints((t) => 1 - 2 ** (-10 * t));
export const expoInOut: EasingFn = withEndpoints((t) =>
  t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
);

export const sineIn: EasingFn = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const sineOut: EasingFn = (t) => Math.sin((t * Math.PI) / 2);
export const sineInOut: EasingFn = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export const circIn: EasingFn = (t) => 1 - Math.sqrt(1 - t * t);
export const circOut: EasingFn = (t) => Math.sqrt(1 - (t - 1) ** 2);
export const circInOut: EasingFn = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2
    : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2;

const BACK_C1 = 1.70158;
const BACK_C2 = BACK_C1 * 1.525;
const BACK_C3 = BACK_C1 + 1;

export const backIn: EasingFn = (t) => BACK_C3 * t ** 3 - BACK_C1 * t * t;
export const backOut: EasingFn = (t) =>
  1 + BACK_C3 * (t - 1) ** 3 + BACK_C1 * (t - 1) ** 2;
export const backInOut: EasingFn = (t) =>
  t < 0.5
    ? ((2 * t) ** 2 * ((BACK_C2 + 1) * 2 * t - BACK_C2)) / 2
    : ((2 * t - 2) ** 2 * ((BACK_C2 + 1) * (t * 2 - 2) + BACK_C2) + 2) / 2;

const ELASTIC_C4 = (2 * Math.PI) / 3;
const ELASTIC_C5 = (2 * Math.PI) / 4.5;

export const elasticIn: EasingFn = withEndpoints(
  (t) => -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * ELASTIC_C4),
);
export const elasticOut: EasingFn = withEndpoints(
  (t) => 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_C4) + 1,
);
export const elasticInOut: EasingFn = withEndpoints((t) =>
  t < 0.5
    ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * ELASTIC_C5)) / 2
    : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * ELASTIC_C5)) / 2 + 1,
);

const BOUNCE_N = 7.5625;
const BOUNCE_D = 2.75;

export const bounceOut: EasingFn = (t) => {
  if (t < 1 / BOUNCE_D) return BOUNCE_N * t * t;
  if (t < 2 / BOUNCE_D) {
    const v = t - 1.5 / BOUNCE_D;
    return BOUNCE_N * v * v + 0.75;
  }
  if (t < 2.5 / BOUNCE_D) {
    const v = t - 2.25 / BOUNCE_D;
    return BOUNCE_N * v * v + 0.9375;
  }
  const v = t - 2.625 / BOUNCE_D;
  return BOUNCE_N * v * v + 0.984375;
};
export const bounceIn: EasingFn = (t) => 1 - bounceOut(1 - t);
export const bounceInOut: EasingFn = (t) =>
  t < 0.5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2;
