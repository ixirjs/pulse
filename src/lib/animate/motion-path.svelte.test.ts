/**
 * motionPath() in a real browser. Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { motionPath } from './motion-path';

let el: HTMLElement | null = null;

const mount = (): HTMLElement => {
	el = document.createElement('div');
	el.style.width = '20px';
	el.style.height = '20px';
	document.body.appendChild(el);
	return el;
};

afterEach(() => {
	el?.remove();
	el = null;
});

describe('motionPath()', () => {
	it('wires offset-path and offset-rotate inline', () => {
		const node = mount();
		const controller = motionPath(node, 'M0,0 L100,0', { duration: 100 });
		// The browser re-serializes the path() value, so match loosely.
		expect(node.style.offsetPath.startsWith('path(')).toBe(true);
		expect(node.style.offsetPath).toContain('100');
		expect(node.style.offsetRotate).toBe('auto');
		expect(controller.animations.length).toBeGreaterThan(0);
		controller.cancel();
	});

	it('disables rotation when rotate is false', () => {
		const node = mount();
		motionPath(node, 'M0,0 L100,0', { rotate: false, duration: 100 }).cancel();
		expect(node.style.offsetRotate).toBe('0deg');
	});

	// Regression: WAAPI keyframes must be keyed by the camelCased IDL name.
	// With the hyphenated `offset-distance` key Chrome ignored the keyframes
	// and the element jumped to the end instead of travelling the path.
	it('interpolates offset-distance continuously (does not snap)', async () => {
		const node = mount();
		motionPath(node, 'M0,0 C 60,-90 180,90 240,0', { duration: 300 });
		const seen = new Set<string>();
		const start = performance.now();
		await new Promise<void>((resolve) => {
			const tick = () => {
				seen.add(getComputedStyle(node).offsetDistance);
				if (performance.now() - start >= 150) resolve();
				else requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		});
		// A snapping animation yields ≤2 distinct values; a smooth one yields many.
		expect(seen.size).toBeGreaterThan(3);
	});
});
