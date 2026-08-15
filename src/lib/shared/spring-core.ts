/**
 * Spring physics simulation and cache — shared between the `animate` and
 * `easing` packages so both can refer to the same cached result without
 * creating a circular import between those packages.
 *
 * This module has zero DOM dependencies and only imports from `shared/types`.
 */

import type { SpringOptions } from './types';

const DT_MS = 1000 / 60;
const MAX_DURATION_MS = 10_000;

/** The library's default spring feel — shared by the sampled spring and the live integrator. */
export const SPRING_DEFAULTS = {
	stiffness: 170,
	damping: 26,
	mass: 1,
	velocity: 0,
	restDelta: 0.001,
	restSpeed: 0.001
} as const;

/** Normalized progress samples plus the settling duration. */
export interface SpringSamples {
	/** Normalized progress values in `[0, 1]` evenly spaced at 60 fps. */
	samples: number[];
	/** Total settling duration in ms. */
	duration: number;
}

interface CachedSpring {
	spring: SpringSamples;
	/** Pre-rendered WAAPI `linear(…)` easing string at full simulation fidelity. */
	linearEasingCss: string;
}

/** Build a WAAPI `linear(…)` easing string from normalized samples. */
export const samplesToLinearEasing = (samples: readonly number[]): string =>
	`linear(${samples.map((s) => s.toFixed(5)).join(', ')})`;

/**
 * Sample a normalized progress array at fractional progress `t`, linearly
 * interpolating between adjacent frames. `t` outside `[0, 1]` clamps to the
 * first / last sample.
 */
export const sampleAt = (samples: readonly number[], t: number): number => {
	const last = samples.length - 1;
	if (t <= 0) return samples[0]!;
	if (t >= 1) return samples[last]!;
	const pos = t * last;
	const lo = Math.floor(pos);
	return samples[lo]! + (samples[lo + 1]! - samples[lo]!) * (pos - lo);
};

/** Apply the documented spring defaults, yielding a fully-populated config. */
const withSpringDefaults = (o: SpringOptions): Required<SpringOptions> => ({
	...SPRING_DEFAULTS,
	...o
});

const cacheKey = (o: SpringOptions): string => {
	const { stiffness, damping, mass, velocity, restDelta, restSpeed } = withSpringDefaults(o);
	return `${stiffness}|${damping}|${mass}|${velocity}|${restDelta}|${restSpeed}`;
};

const SPRING_CACHE = new Map<string, CachedSpring>();
const SPRING_CACHE_LIMIT = 128;

/**
 * Run the spring simulation and cache the result.
 * Results are memoized by canonical option key — the simulation, sample array
 * and pre-built `linear(…)` CSS string are all reused across identical calls.
 */
export const getCachedSpring = (options: SpringOptions = {}): CachedSpring => {
	const key = cacheKey(options);
	const hit = SPRING_CACHE.get(key);
	if (hit) return hit;

	const spring = simulateSpring(options);
	const entry: CachedSpring = {
		spring,
		linearEasingCss: samplesToLinearEasing(spring.samples)
	};

	if (SPRING_CACHE.size >= SPRING_CACHE_LIMIT) {
		SPRING_CACHE.delete(SPRING_CACHE.keys().next().value!);
	}
	SPRING_CACHE.set(key, entry);
	return entry;
};

/**
 * Simulate a spring travelling from 0 → 1 and return per-frame normalized
 * samples plus the settling duration. Results are memoized by option key.
 */
export const spring = (options: SpringOptions = {}): SpringSamples =>
	getCachedSpring(options).spring;

const simulateSpring = (options: SpringOptions): SpringSamples => {
	const { stiffness, damping, mass, restDelta, restSpeed, velocity } = withSpringDefaults(options);

	const dtSec = DT_MS / 1000;
	const invMass = 1 / mass;
	const target = 1;

	let pos = 0;
	let vel = velocity / 1000;
	const samples: number[] = [0];

	let restingFrames = 0;
	const requiredRestingFrames = 3;

	for (let elapsed = DT_MS; elapsed <= MAX_DURATION_MS; elapsed += DT_MS) {
		const force = -stiffness * (pos - target) - damping * vel;
		vel += force * invMass * dtSec;
		pos += vel * dtSec;
		samples.push(pos);

		if (Math.abs(target - pos) < restDelta && Math.abs(vel) < restSpeed) {
			if (++restingFrames >= requiredRestingFrames) break;
		} else {
			restingFrames = 0;
		}
	}

	samples[samples.length - 1] = target;
	return { samples, duration: (samples.length - 1) * DT_MS };
};
