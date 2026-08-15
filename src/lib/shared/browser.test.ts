/**
 * Tests for browser environment detection utilities.
 * Runs in the `server` (node) vitest project where `window` is undefined,
 * so isBrowser() is always false and reduced motion never suppresses animation.
 */

import { describe, expect, it } from 'vitest';
import { isBrowser, shouldReduceMotion } from './browser';

describe('isBrowser()', () => {
	it('returns false in node environment', () => {
		expect(isBrowser()).toBe(false);
	});

	it('returns a boolean', () => {
		expect(typeof isBrowser()).toBe('boolean');
	});
});

describe('shouldReduceMotion()', () => {
	it('returns false in node environment (no matchMedia)', () => {
		expect(shouldReduceMotion()).toBe(false);
	});

	it('returns false when the respect flag is off, regardless of environment', () => {
		expect(shouldReduceMotion(false)).toBe(false);
	});

	it('returns a boolean', () => {
		expect(typeof shouldReduceMotion()).toBe('boolean');
	});
});
