/**
 * Pure timing resolution — runs in the `server` (node) project.
 */

import { describe, expect, it } from 'vitest';
import { easeOut } from '$lib/easing';
import { resolveViewTransitionTiming } from './timing';

describe('resolveViewTransitionTiming()', () => {
	it('returns null when nothing is configured (keep browser default)', () => {
		expect(resolveViewTransitionTiming({})).toBeNull();
	});

	it('compiles a spring to a linear() easing with a natural duration', () => {
		const timing = resolveViewTransitionTiming({ spring: true });
		expect(timing?.easing).toMatch(/^linear\(/);
		expect(typeof timing?.duration).toBe('number');
		expect(timing?.duration).toBeGreaterThan(0);
	});

	it('honors a custom spring config', () => {
		const stiff = resolveViewTransitionTiming({ spring: { stiffness: 400, damping: 40 } });
		const soft = resolveViewTransitionTiming({ spring: { stiffness: 80, damping: 40 } });
		// A stiffer spring settles sooner.
		expect(stiff?.duration).toBeLessThan(soft?.duration as number);
	});

	it('lets an explicit duration override the spring duration', () => {
		const timing = resolveViewTransitionTiming({ spring: true, duration: 1234 });
		expect(timing?.duration).toBe(1234);
		expect(timing?.easing).toMatch(/^linear\(/);
	});

	it('resamples an EasingFn to a linear() string', () => {
		const timing = resolveViewTransitionTiming({ easing: easeOut, duration: 300 });
		expect(timing?.easing).toMatch(/^linear\(/);
		expect(timing?.duration).toBe(300);
	});

	it('omits duration for an EasingFn when none is given', () => {
		const timing = resolveViewTransitionTiming({ easing: easeOut });
		expect(timing?.easing).toMatch(/^linear\(/);
		expect(timing && 'duration' in timing).toBe(false);
	});

	it('passes a CSS easing keyword through unchanged', () => {
		expect(resolveViewTransitionTiming({ easing: 'ease-in-out' })).toEqual({
			easing: 'ease-in-out'
		});
	});

	it('accepts a bare duration', () => {
		expect(resolveViewTransitionTiming({ duration: 500 })).toEqual({ duration: 500 });
	});

	it('prefers spring over easing when both are set', () => {
		const timing = resolveViewTransitionTiming({ spring: true, easing: 'ease-in' });
		// Spring path carries a natural duration; the easing-string path never does.
		expect(typeof timing?.duration).toBe('number');
	});
});
