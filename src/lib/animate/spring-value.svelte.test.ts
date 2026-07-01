/**
 * Live SpringValue behaviour with a real `requestAnimationFrame`.
 * Runs in the `client` (browser) vitest project.
 */

import { describe, expect, it, vi } from 'vitest';
import { createSpringValue } from './spring-value';

describe('createSpringValue() — live', () => {
	it('animates to the target and settles exactly there', async () => {
		const s = createSpringValue({ stiffness: 300, damping: 30 });
		s.set(100);
		expect(s.animating).toBe(true);
		await s.finished;
		expect(s.current).toBe(100);
		expect(s.animating).toBe(false);
	});

	it('notifies subscribers as it animates', async () => {
		const s = createSpringValue();
		const seen: number[] = [];
		s.subscribe((v) => seen.push(v));
		s.set(50);
		await s.finished;
		// First sample is the initial 0; the value moves and lands on 50.
		expect(seen[0]).toBe(0);
		expect(seen.at(-1)).toBe(50);
		expect(seen.length).toBeGreaterThan(2);
	});

	it('preserves momentum when re-targeted mid-flight', async () => {
		const s = createSpringValue({ stiffness: 120, damping: 20 });
		s.set(200);
		await vi.waitFor(() => expect(s.current).toBeGreaterThan(20));
		const vMid = s.velocity;
		expect(vMid).toBeGreaterThan(0); // moving toward 200
		s.set(0); // reverse target — velocity should still be the carried value
		expect(s.velocity).toBe(vMid);
		await s.finished;
		expect(s.current).toBe(0);
	});

	it('jump() teleports without animating', () => {
		const s = createSpringValue();
		s.jump(42);
		expect(s.current).toBe(42);
		expect(s.animating).toBe(false);
	});
});
