import type { SpringOptions } from "./types";

const DT_MS = 1000 / 60;
const MAX_DURATION_MS = 10_000;

const SPRING_DEFAULTS = {
  stiffness: 170,
  damping: 26,
  mass: 1,
  velocity: 0,
  restDelta: 0.001,
  restSpeed: 0.001,
} as const;

export interface Spring {
  /** Normalized progress samples in `[0, 1]` evenly spaced over `duration`. */
  samples: number[];
  /** Total settling duration in ms. */
  duration: number;
}

/**
 * Simulate a critically/under/over-damped spring travelling from 0 → 1
 * and return per-frame normalized samples plus the settling duration.
 *
 * The samples can be fed into a WAAPI `linear()` easing string so that any
 * CSS property (color, length, custom var, …) follows the spring curve.
 *
 * Results are memoized by canonical option key — the simulation, sample
 * array and the rendered `linear(…)` CSS string are all reused across calls
 * with the same physics parameters. This is the single hottest path in the
 * library when spring animations are issued repeatedly (drag, scroll, …).
 */
export const spring = (options: SpringOptions = {}): Spring => {
  return getCachedSpring(options).spring;
};

interface CachedSpring {
  spring: Spring;
  /** Pre-rendered WAAPI `linear(…)` easing string at full simulation fidelity. */
  linearEasingCss: string;
}

const SPRING_CACHE = new Map<string, CachedSpring>();
const SPRING_CACHE_LIMIT = 128;

const cacheKey = (o: SpringOptions): string =>
  // 7 numeric fields → tiny key. Coerce undefined to default so equivalent
  // calls collide.
  `${o.stiffness ?? SPRING_DEFAULTS.stiffness}|${o.damping ?? SPRING_DEFAULTS.damping}|${o.mass ?? SPRING_DEFAULTS.mass}|${o.velocity ?? SPRING_DEFAULTS.velocity}|${o.restDelta ?? SPRING_DEFAULTS.restDelta}|${o.restSpeed ?? SPRING_DEFAULTS.restSpeed}`;

/** @internal — used by easings + normalize to share the cached linear() CSS. */
export const getCachedSpring = (options: SpringOptions = {}): CachedSpring => {
  const key = cacheKey(options);
  const hit = SPRING_CACHE.get(key);
  if (hit) return hit;

  const result = simulateSpring(options);
  const entry: CachedSpring = {
    spring: result,
    linearEasingCss: samplesToLinearCss(result.samples),
  };

  if (SPRING_CACHE.size >= SPRING_CACHE_LIMIT) {
    // Drop the oldest entry — Map iteration is insertion-ordered.
    const firstKey = SPRING_CACHE.keys().next().value;
    if (firstKey !== undefined) SPRING_CACHE.delete(firstKey);
  }
  SPRING_CACHE.set(key, entry);
  return entry;
};

const samplesToLinearCss = (samples: readonly number[]): string => {
  const parts = new Array<string>(samples.length);
  for (let i = 0; i < samples.length; i++) parts[i] = samples[i]!.toFixed(5);
  return `linear(${parts.join(", ")})`;
};

const simulateSpring = (options: SpringOptions): Spring => {
  const stiffness = options.stiffness ?? SPRING_DEFAULTS.stiffness;
  const damping = options.damping ?? SPRING_DEFAULTS.damping;
  const mass = options.mass ?? SPRING_DEFAULTS.mass;
  const restDelta = options.restDelta ?? SPRING_DEFAULTS.restDelta;
  const restSpeed = options.restSpeed ?? SPRING_DEFAULTS.restSpeed;
  // velocity is in `target units per second`; target distance is 1.
  const initialVelocity = (options.velocity ?? SPRING_DEFAULTS.velocity) / 1000;

  const dtSec = DT_MS / 1000;
  const invMass = 1 / mass;
  const target = 1;

  let position = 0;
  let velocity = initialVelocity;
  const samples: number[] = [0];

  let restingFrames = 0;
  // Need to be at rest for ~3 frames so we don't cut early on a zero crossing.
  const requiredRestingFrames = 3;

  for (let elapsed = DT_MS; elapsed <= MAX_DURATION_MS; elapsed += DT_MS) {
    const force = -stiffness * (position - target) - damping * velocity;
    velocity += force * invMass * dtSec;
    position += velocity * dtSec;
    samples.push(position);

    if (
      Math.abs(target - position) < restDelta &&
      Math.abs(velocity) < restSpeed
    ) {
      if (++restingFrames >= requiredRestingFrames) break;
    } else {
      restingFrames = 0;
    }
  }

  // Snap the final sample to exactly the target so the prop lands precisely.
  samples[samples.length - 1] = target;

  return { samples, duration: (samples.length - 1) * DT_MS };
};
