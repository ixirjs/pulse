/**
 * morph() driver in a real browser (rAF + d-attribute writes).
 * Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { morph } from './morph';
import { interpolatePlan, planMorph } from './interpolate';

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

describe('morph()', () => {
	it('settles on the normalized target path', async () => {
		const path = mountPath('M0 0 L10 0');
		const to = 'M0 0 L0 10';
		const ctrl = morph(path, 'M0 0 L10 0', to, { duration: 60 });
		await ctrl.finished;
		expect(path.getAttribute('d')).toBe(interpolatePlan(planMorph('M0 0 L10 0', to), 1));
	});

	it('writes an interpolated path on the first frame', () => {
		const path = mountPath('M0 0 L10 0');
		const ctrl = morph(path, 'M0 0 L10 0', 'M0 0 L0 10', { duration: 500 });
		const d = path.getAttribute('d') ?? '';
		expect(d.startsWith('M0 0C')).toBe(true);
		ctrl.cancel();
	});

	it('snaps to target when subpath counts differ', () => {
		const path = mountPath('M0 0 L1 0');
		const to = 'M0 0 L1 0 M2 2 L3 2';
		const ctrl = morph(path, 'M0 0 L1 0', to, { duration: 200 });
		expect(path.getAttribute('d')).toBe(to);
		ctrl.cancel();
	});
});
