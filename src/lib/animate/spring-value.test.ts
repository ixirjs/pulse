/**
 * SpringValue — exercised in the `server` (node) project, where there is no
 * `requestAnimationFrame`, so `set()` jumps straight to the target while
 * preserving the public contract (subscriptions, `finished`, velocity seeding).
 */

import { describe, expect, it } from 'vitest';
import { createSpringValue } from './spring-value';

describe('createSpringValue()', () => {
	it('starts at the initial value and reports it to subscribers immediately', () => {
		const s = createSpringValue({ initial: 5 });
		let seen = -1;
		s.subscribe((v) => (seen = v));
		expect(s.current).toBe(5);
		expect(seen).toBe(5);
	});

	it('jump() teleports value and target and zeros velocity', () => {
		const s = createSpringValue({ initial: 0 });
		s.setVelocity(100);
		s.jump(42);
		expect(s.current).toBe(42);
		expect(s.target).toBe(42);
		expect(s.velocity).toBe(0);
		expect(s.animating).toBe(false);
	});

	it('set() reaches the target (synchronous fallback without rAF)', () => {
		const s = createSpringValue({ initial: 0 });
		s.set(200);
		expect(s.target).toBe(200);
		expect(s.current).toBe(200);
	});

	it('setVelocity() updates the reported velocity', () => {
		const s = createSpringValue();
		s.setVelocity(-50);
		expect(s.velocity).toBe(-50);
	});

	it('unsubscribe stops further notifications', () => {
		const s = createSpringValue({ initial: 0 });
		let count = 0;
		const off = s.subscribe(() => count++);
		expect(count).toBe(1);
		off();
		s.jump(10);
		expect(count).toBe(1);
	});

	it('finished resolves', async () => {
		const s = createSpringValue({ initial: 0 });
		s.set(1);
		await expect(s.finished).resolves.toBeUndefined();
	});
});
