/**
 * A live, velocity-preserving spring value.
 *
 * Unlike the sampled `spring`/`springEasing` helpers — which bake a fixed
 * `linear(…)` curve up front — this is a continuous mass-spring-damper
 * *integrator* driven by `requestAnimationFrame`. Re-targeting it mid-flight
 * (`.set(next)`) keeps the current velocity, so interrupted springs hand off
 * their momentum instead of snapping back to rest. That makes it the right
 * primitive for interactive motion: drag-release, rapid hover toggles,
 * pointer-following values.
 *
 * It is framework-agnostic — subscribe for updates and write the value
 * wherever you like (an inline style, a custom property, Svelte `$state`).
 *
 * @example
 * ```ts
 * const x = createSpringValue({ stiffness: 220, damping: 24 });
 * x.subscribe((v) => { node.style.setProperty('--motion-x', `${v}px`); });
 * x.set(200);            // springs toward 200, carrying any current velocity
 * // …later, mid-flight:
 * x.set(0);             // reverses smoothly without losing momentum
 * await x.finished;     // resolves when it settles
 * ```
 */

import { isBrowser } from '../shared/browser';
import { SPRING_DEFAULTS } from '../shared/spring-core';
import type { SpringOptions } from '../shared/types';

/** Largest physics step (s) — clamps dt after a tab regains focus. */
const MAX_DT = 1 / 30;

export interface SpringValueOptions extends SpringOptions {
	/** Starting value (also the initial target). Default 0. */
	initial?: number;
}

export interface SpringValue {
	/** Current animated value. */
	readonly current: number;
	/** Current velocity in units/second. */
	readonly velocity: number;
	/** Whether the integrator is currently running. */
	readonly animating: boolean;
	/** The value the spring is settling toward. */
	readonly target: number;
	/** Spring toward `target`, preserving the current velocity. */
	set(target: number): void;
	/**
	 * Seed the current velocity (units/second) without changing the target.
	 * Use before `set()` to hand off momentum — e.g. a drag-release flick.
	 */
	setVelocity(velocity: number): void;
	/** Teleport to `value` immediately, zeroing velocity and stopping. */
	jump(value: number): void;
	/** Subscribe to value changes; returns an unsubscribe fn. Fires immediately. */
	subscribe(listener: (value: number) => void): () => void;
	/** Stop the integrator where it is (velocity retained for the next `set`). */
	stop(): void;
	/** Resolves the next time the spring settles at its target. */
	readonly finished: Promise<void>;
}

/**
 * Create a {@link SpringValue}. In non-browser environments there is no rAF,
 * so `set()` jumps straight to the target (and resolves `finished`).
 */
export const createSpringValue = (options: SpringValueOptions = {}): SpringValue => {
	const { stiffness, damping, mass, restDelta, restSpeed } = {
		...SPRING_DEFAULTS,
		...options
	};
	const invMass = 1 / mass;

	let value = options.initial ?? 0;
	let target = value;
	let velocity = options.velocity ?? 0;
	let frame: number | null = null;
	let lastTime = 0;

	const listeners = new Set<(v: number) => void>();
	const notify = (): void => {
		for (const l of listeners) l(value);
	};

	let resolveRest: (() => void) | null = null;
	let restPromise = Promise.resolve();
	const armRestPromise = (): void => {
		if (resolveRest) return;
		restPromise = new Promise<void>((res) => (resolveRest = res));
	};
	const settle = (): void => {
		const r = resolveRest;
		resolveRest = null;
		r?.();
	};

	const stop = (): void => {
		if (frame != null) {
			cancelAnimationFrame(frame);
			frame = null;
		}
	};

	const atRest = (): boolean =>
		Math.abs(target - value) < restDelta && Math.abs(velocity) < restSpeed;

	const tick = (now: number): void => {
		// dt in seconds, clamped so a long pause can't explode the integrator.
		const dt = Math.min((now - lastTime) / 1000, MAX_DT);
		lastTime = now;

		// Semi-implicit Euler — same scheme as the sampled spring core.
		const force = -stiffness * (value - target) - damping * velocity;
		velocity += force * invMass * dt;
		value += velocity * dt;

		if (atRest()) {
			value = target;
			velocity = 0;
			frame = null;
			notify();
			settle();
			return;
		}
		notify();
		frame = requestAnimationFrame(tick);
	};

	const start = (): void => {
		if (frame != null || !isBrowser()) return;
		armRestPromise();
		lastTime = performance.now();
		frame = requestAnimationFrame(tick);
	};

	return {
		get current() {
			return value;
		},
		get velocity() {
			return velocity;
		},
		get animating() {
			return frame != null;
		},
		get target() {
			return target;
		},
		set(next: number) {
			target = next;
			if (atRest()) {
				value = next;
				velocity = 0;
				notify();
				settle();
				return;
			}
			if (!isBrowser()) {
				// No rAF: jump to the target but keep the API contract.
				value = next;
				velocity = 0;
				notify();
				return;
			}
			start();
		},
		setVelocity(next: number) {
			velocity = next;
		},
		jump(next: number) {
			stop();
			value = next;
			target = next;
			velocity = 0;
			notify();
			settle();
		},
		subscribe(listener) {
			listeners.add(listener);
			listener(value);
			return () => listeners.delete(listener);
		},
		stop,
		get finished() {
			return restPromise;
		}
	};
};
