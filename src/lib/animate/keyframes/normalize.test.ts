/**
 * Tests for input normalization and per-prop timing resolution.
 * Pure logic — runs in the `server` vitest project.
 */

import { describe, expect, it } from 'vitest';
import { normalizeInput, resolveTiming } from './normalize';
import { springEasing } from '../../easing';
import type { AnimateDefaults, PropConfig } from '../types';

const DEFAULTS: AnimateDefaults = {};

describe('normalizeInput() — shorthands', () => {
	it('bare number resolves to PropConfig with correct `to`', () => {
		const result = normalizeInput(100, DEFAULTS);
		expect(result.to).toBe(100);
		expect(result.from).toBeUndefined();
	});

	it('bare string resolves to PropConfig with correct `to`', () => {
		const result = normalizeInput('50%', DEFAULTS);
		expect(result.to).toBe('50%');
	});

	it('[from, to] array is normalized correctly', () => {
		const result = normalizeInput([0, 1], DEFAULTS);
		expect(result.from).toBe(0);
		expect(result.to).toBe(1);
	});

	it('PropConfig object is passed through', () => {
		const input: PropConfig = { from: 10, to: 100, duration: 500 };
		const result = normalizeInput(input, DEFAULTS);
		expect(result.from).toBe(10);
		expect(result.to).toBe(100);
		expect(result.duration).toBe(500);
	});
});

describe('normalizeInput() — defaults inheritance', () => {
	it('inherits duration from defaults when not set on prop', () => {
		const result = normalizeInput(100, { duration: 400 });
		expect(result.duration).toBe(400);
	});

	it('prop-level duration overrides defaults', () => {
		const result = normalizeInput({ to: 100, duration: 200 }, { duration: 400 });
		expect(result.duration).toBe(200);
	});

	it('inherits easing from defaults', () => {
		const fn = (t: number) => t;
		const result = normalizeInput(100, { easing: fn });
		expect(result.easing).toBe(fn);
	});

	it('prop-level easing overrides defaults', () => {
		const fn1 = (t: number) => t;
		const fn2 = (t: number) => t * t;
		const result = normalizeInput({ to: 100, easing: fn2 }, { easing: fn1 });
		expect(result.easing).toBe(fn2);
	});

	it('inherits delay from defaults', () => {
		const result = normalizeInput(100, { delay: 150 });
		expect(result.delay).toBe(150);
	});

	it('inherits spring from defaults', () => {
		const result = normalizeInput(100, { spring: true });
		expect(result.spring).toBe(true);
	});
});

describe('resolveTiming() — non-spring', () => {
	it('uses DEFAULT_DURATION (300) when no duration set', () => {
		const config: PropConfig = { to: 1 };
		const { duration } = resolveTiming(config);
		expect(duration).toBe(300);
	});

	it('uses explicit duration', () => {
		const config: PropConfig = { to: 1, duration: 600 };
		const { duration } = resolveTiming(config);
		expect(duration).toBe(600);
	});

	it('uses SpringEasingFn natural duration when no explicit duration', () => {
		const seFn = springEasing({ stiffness: 200, damping: 24 });
		const config: PropConfig = { to: 1, easing: seFn };
		const { duration } = resolveTiming(config);
		expect(duration).toBeCloseTo(seFn.duration, 0);
	});

	it('explicit duration overrides SpringEasingFn natural duration', () => {
		const seFn = springEasing({ stiffness: 200, damping: 24 });
		const config: PropConfig = { to: 1, easing: seFn, duration: 999 };
		const { duration } = resolveTiming(config);
		expect(duration).toBe(999);
	});

	it('easing is a CSS string for plain easing fn', () => {
		const config: PropConfig = { to: 1, easing: (t: number) => t };
		const { easing } = resolveTiming(config);
		expect(easing.startsWith('linear(')).toBe(true);
	});

	it('easing uses pre-built linear string for SpringEasingFn', () => {
		const seFn = springEasing();
		const config: PropConfig = { to: 1, easing: seFn };
		const { easing } = resolveTiming(config);
		expect(easing).toBe(seFn._linearEasing);
	});

	it('delay defaults to 0', () => {
		const config: PropConfig = { to: 1 };
		const { delay } = resolveTiming(config);
		expect(delay).toBe(0);
	});

	it('delay uses prop value when set', () => {
		const config: PropConfig = { to: 1, delay: 200 };
		const { delay } = resolveTiming(config);
		expect(delay).toBe(200);
	});
});

describe('resolveTiming() — spring', () => {
	it('uses spring simulation duration by default', () => {
		const config: PropConfig = { to: 1, spring: { stiffness: 200, damping: 25 } };
		const { duration } = resolveTiming(config);
		expect(duration).toBeGreaterThan(0);
	});

	it('explicit duration overrides spring simulation duration', () => {
		const config: PropConfig = { to: 1, spring: true, duration: 777 };
		const { duration } = resolveTiming(config);
		expect(duration).toBe(777);
	});

	it('spring: true uses default spring parameters', () => {
		const config: PropConfig = { to: 1, spring: true };
		const { duration } = resolveTiming(config);
		expect(duration).toBeGreaterThan(0);
	});

	it('easing is a linear() CSS string from cached spring samples', () => {
		const config: PropConfig = { to: 1, spring: { stiffness: 170, damping: 26 } };
		const { easing } = resolveTiming(config);
		expect(easing.startsWith('linear(')).toBe(true);
	});
});
