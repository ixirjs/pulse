/**
 * Live animateValue() / countUp() behaviour with a real `requestAnimationFrame`.
 * Runs in the `client` (browser) vitest project.
 */

import { describe, expect, it } from 'vitest';
import { animateValue, countUp } from './animate-value';

describe('animateValue() — live', () => {
	it('tweens to the target and emits intermediate values', async () => {
		const seen: number[] = [];
		const ctrl = animateValue(0, 100, {
			duration: 60,
			onUpdate: (v) => seen.push(v)
		});
		await ctrl.finished;
		// Lands exactly on the target.
		expect(seen.at(-1)).toBe(100);
		// More than two distinct values were produced along the way.
		expect(new Set(seen).size).toBeGreaterThan(2);
	});

	it('fires onComplete after the final update', async () => {
		let completed = false;
		let lastValue = NaN;
		const ctrl = animateValue(0, 10, {
			duration: 40,
			onUpdate: (v) => (lastValue = v),
			onComplete: () => (completed = true)
		});
		await ctrl.finished;
		expect(completed).toBe(true);
		expect(lastValue).toBe(10);
	});

	it('rounds emitted values when round is true', async () => {
		const seen: number[] = [];
		const ctrl = animateValue(0, 100, {
			duration: 60,
			round: true,
			onUpdate: (v) => seen.push(v)
		});
		await ctrl.finished;
		expect(seen.every((v) => Number.isInteger(v))).toBe(true);
		expect(seen.at(-1)).toBe(100);
	});

	it('rounds to N decimals when round is a number', async () => {
		const seen: number[] = [];
		const ctrl = animateValue(0, 1, {
			duration: 60,
			round: 2,
			onUpdate: (v) => seen.push(v)
		});
		await ctrl.finished;
		// No value carries more than 2 decimal places.
		expect(seen.every((v) => v === Math.round(v * 100) / 100)).toBe(true);
		expect(seen.at(-1)).toBe(1);
	});

	it('stop() halts the tween before completion', async () => {
		let completed = false;
		const ctrl = animateValue(0, 100, {
			duration: 10000,
			onUpdate: () => {},
			onComplete: () => (completed = true)
		});
		ctrl.stop();
		await ctrl.finished;
		expect(completed).toBe(false);
	});
});

describe('countUp() — live', () => {
	it('writes the interpolated value into textContent, landing on the target', async () => {
		const el = document.createElement('span');
		el.textContent = '0';
		const ctrl = countUp(el, 50, { duration: 60 });
		await ctrl.finished;
		expect(el.textContent).toBe('50');
	});

	it('starts from the element current numeric textContent', async () => {
		const el = document.createElement('span');
		el.textContent = '10';
		const ctrl = countUp(el, 20, { duration: 60 });
		// Counts up from 10, so it never dips below the starting value.
		await ctrl.finished;
		expect(el.textContent).toBe('20');
	});

	it('falls back to 0 when textContent is not numeric', async () => {
		const el = document.createElement('span');
		el.textContent = 'hello';
		const ctrl = countUp(el, 5, { duration: 60 });
		await ctrl.finished;
		expect(el.textContent).toBe('5');
	});
});
