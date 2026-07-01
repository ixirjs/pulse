/**
 * Tests for the `animate()` public entry point in non-browser environments.
 * In node (no window/document) `animate()` always returns a `noopController`.
 * Pure — runs in the `server` vitest project.
 */

import { describe, expect, it, vi } from 'vitest';
import { animate } from './animate';

// Cast to satisfy TypeScript — the element is never accessed in server mode
// because `isBrowser()` returns false before any DOM call is made.
const el = {} as HTMLElement;

describe('animate() — non-browser (server) environment', () => {
	it('returns an object with the AnimationController shape', () => {
		const ctrl = animate(el, { opacity: [0, 1] });
		expect(ctrl).toHaveProperty('animations');
		expect(ctrl).toHaveProperty('finished');
		expect(ctrl).toHaveProperty('cancel');
		expect(ctrl).toHaveProperty('play');
		expect(ctrl).toHaveProperty('pause');
	});

	it('animations is empty in non-browser', () => {
		const ctrl = animate(el, { opacity: 1 });
		expect(ctrl.animations).toHaveLength(0);
	});

	it('finished resolves immediately', async () => {
		const ctrl = animate(el, { x: 100 });
		await expect(ctrl.finished).resolves.toBeUndefined();
	});

	it('calls onStart with the element', () => {
		const onStart = vi.fn();
		animate(el, { opacity: 1 }, { onStart });
		expect(onStart).toHaveBeenCalledWith(el);
	});

	it('calls onEnd with finished: true', () => {
		const onEnd = vi.fn();
		animate(el, { opacity: 1 }, { onEnd });
		expect(onEnd).toHaveBeenCalledWith(el, { finished: true });
	});

	it('does not throw for an empty props object', () => {
		expect(() => animate(el, {})).not.toThrow();
	});

	it('does not throw for various prop shorthands', () => {
		expect(() =>
			animate(el, {
				opacity: [0, 1],
				x: 100,
				scale: { to: 1.2, duration: 300 }
			})
		).not.toThrow();
	});
});
