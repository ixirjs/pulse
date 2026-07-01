/**
 * Pure scroll-progress math. Runs in the `server` (node) vitest project.
 */

import { describe, expect, it } from 'vitest';
import { coverProgress, containProgress, pageProgress } from './progress';

describe('pageProgress()', () => {
	it('is 0 at the top and 1 at the bottom', () => {
		expect(pageProgress(0, 1000, 500)).toBe(0);
		expect(pageProgress(500, 1000, 500)).toBe(1);
	});

	it('is linear in between', () => {
		expect(pageProgress(250, 1000, 500)).toBe(0.5);
	});

	it('clamps and avoids divide-by-zero', () => {
		expect(pageProgress(9999, 1000, 500)).toBe(1);
		expect(pageProgress(0, 500, 500)).toBe(0);
	});
});

describe('coverProgress()', () => {
	it('is 0 as the element is about to enter and 1 once gone', () => {
		expect(coverProgress(1000, 200, 500, 500)).toBe(0);
		expect(coverProgress(1000, 200, 500, 1200)).toBe(1);
	});

	it('is 0.5 at the midpoint of the cover range', () => {
		expect(coverProgress(1000, 200, 500, 850)).toBe(0.5);
	});
});

describe('containProgress()', () => {
	it('maps the fully-visible span to [0,1]', () => {
		expect(containProgress(1000, 200, 500, 700)).toBe(0);
		expect(containProgress(1000, 200, 500, 1000)).toBe(1);
		expect(containProgress(1000, 200, 500, 850)).toBe(0.5);
	});
});
