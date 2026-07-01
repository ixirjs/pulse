/**
 * draw() SVG helper in a real browser (needs getTotalLength).
 * Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { draw } from './draw';

const SVG_NS = 'http://www.w3.org/2000/svg';
let svg: SVGSVGElement | null = null;

const mountPath = (d: string): SVGPathElement => {
	svg = document.createElementNS(SVG_NS, 'svg');
	const path = document.createElementNS(SVG_NS, 'path');
	path.setAttribute('d', d);
	svg.appendChild(path);
	document.body.appendChild(svg);
	return path;
};

afterEach(() => {
	svg?.remove();
	svg = null;
});

describe('draw()', () => {
	it('sets stroke-dasharray to the path length and returns a controller', () => {
		const path = mountPath('M0 0 L100 0');
		const controller = draw(path, { duration: 100 });
		expect(path.style.strokeDasharray).toBe('100');
		expect(controller.animations.length).toBeGreaterThan(0);
		controller.cancel();
	});

	it('animates dashoffset from length to 0 when drawing on', async () => {
		const path = mountPath('M0 0 L100 0');
		const controller = draw(path, { duration: 60 });
		await controller.finished;
		// Fully drawn: dashoffset settles at 0.
		const offset = getComputedStyle(path).strokeDashoffset;
		expect(parseFloat(offset)).toBeCloseTo(0, 1);
	});

	// Regression: WAAPI keyframes must be keyed by the camelCased IDL name.
	// With the hyphenated `stroke-dashoffset` key Chrome ignored the keyframes
	// and the value snapped instead of interpolating continuously.
	it('interpolates dashoffset continuously (does not snap)', async () => {
		const path = mountPath('M0 0 L100 0');
		draw(path, { duration: 300 });
		const seen = new Set<string>();
		const start = performance.now();
		await new Promise<void>((resolve) => {
			const tick = () => {
				seen.add(getComputedStyle(path).strokeDashoffset);
				if (performance.now() - start >= 150) resolve();
				else requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		});
		// A snapping animation yields ≤2 distinct values; a smooth one yields many.
		expect(seen.size).toBeGreaterThan(3);
	});
});
