/**
 * Tests for animateFlip() in non-browser environments.
 * `isBrowser()` returns false in node → animateFlip() returns null immediately.
 * Runs in the `server` vitest project.
 */

import { describe, expect, it, vi } from 'vitest';
import { animateFlip } from './animator';
import type { FlipRect } from './types';

const rect = (x = 0, y = 0, w = 100, h = 50): FlipRect => ({
	x,
	y,
	width: w,
	height: h
});

const el = {} as HTMLElement;

describe('animateFlip() — non-browser environment', () => {
	it('returns null when not in browser', () => {
		const result = animateFlip({
			element: el,
			from: rect(0, 0, 100, 50),
			to: rect(100, 0, 100, 50)
		});
		expect(result).toBeNull();
	});

	it('does not throw for equal rects', () => {
		const r = rect();
		expect(() => animateFlip({ element: el, from: r, to: r })).not.toThrow();
	});

	it('does not call onStart or onEnd in non-browser mode', () => {
		const onStart = vi.fn();
		const onEnd = vi.fn();
		animateFlip({
			element: el,
			from: rect(0, 0, 100, 50),
			to: rect(100, 0, 100, 50),
			options: { onStart, onEnd }
		});
		expect(onStart).not.toHaveBeenCalled();
		expect(onEnd).not.toHaveBeenCalled();
	});

	it('returns null for forward mode too', () => {
		const result = animateFlip({
			element: el,
			from: rect(),
			to: rect(200, 200, 50, 25),
			forward: true
		});
		expect(result).toBeNull();
	});
});
