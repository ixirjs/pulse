import type { EasingFn } from '../animate/types';

export const linear: EasingFn = (t) => t;

const pow = (n: number): EasingFn => (t) => t ** n;

export const quadIn: EasingFn = pow(2);
export const quadOut: EasingFn = (t) => 1 - (1 - t) ** 2;
export const quadInOut: EasingFn = (t) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

export const cubicIn: EasingFn = pow(3);
export const cubicOut: EasingFn = (t) => 1 - (1 - t) ** 3;
export const cubicInOut: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export const quartIn: EasingFn = pow(4);
export const quartOut: EasingFn = (t) => 1 - (1 - t) ** 4;
export const quartInOut: EasingFn = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2;

export const quintIn: EasingFn = pow(5);
export const quintOut: EasingFn = (t) => 1 - (1 - t) ** 5;
export const quintInOut: EasingFn = (t) =>
  t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;

export const expoIn: EasingFn = (t) => (t === 0 ? 0 : 2 ** (10 * t - 10));
export const expoOut: EasingFn = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));
export const expoInOut: EasingFn = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
};

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

export const elasticIn: EasingFn = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * ELASTIC_C4);
};
export const elasticOut: EasingFn = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_C4) + 1;
};
export const elasticInOut: EasingFn = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * ELASTIC_C5)) / 2
    : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * ELASTIC_C5)) / 2 + 1;
};

export const bounceOut: EasingFn = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    const v = t - 1.5 / d1;
    return n1 * v * v + 0.75;
  }
  if (t < 2.5 / d1) {
    const v = t - 2.25 / d1;
    return n1 * v * v + 0.9375;
  }
  const v = t - 2.625 / d1;
  return n1 * v * v + 0.984375;
};
export const bounceIn: EasingFn = (t) => 1 - bounceOut(1 - t);
export const bounceInOut: EasingFn = (t) =>
  t < 0.5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2;
