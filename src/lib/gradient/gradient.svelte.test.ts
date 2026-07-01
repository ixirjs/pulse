/**
 * animateGradient() driver in a real browser (canvas colour resolution + rAF).
 * Read-back of `background-image` is normalized by the engine (e.g.
 * `rgba(r,g,b,1)` → `rgb(r,g,b)`), so assertions compare against a reference
 * element set to the expected gradient rather than matching raw substrings.
 * Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { animateGradient } from './gradient';

let mounted: HTMLElement[] = [];

const mount = (): HTMLElement => {
	const el = document.createElement('div');
	document.body.appendChild(el);
	mounted.push(el);
	return el;
};

/** Normalized serialization of a gradient string, as the engine stores it. */
const normalized = (gradient: string): string => {
	const ref = mount();
	ref.style.backgroundImage = gradient;
	return ref.style.backgroundImage;
};

afterEach(() => {
	for (const el of mounted) el.remove();
	mounted = [];
});

describe('animateGradient()', () => {
	it('settles on the target gradient', async () => {
		const el = mount();
		const target = 'linear-gradient(90deg, #00ff00 0%, #ffff00 100%)';
		const ctrl = animateGradient(el, 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)', target, {
			duration: 60
		});
		await ctrl.finished;
		expect(el.style.backgroundImage).toBe(normalized(target));
	});

	it('writes the start gradient on the first synchronous frame', () => {
		const el = mount();
		const from = 'linear-gradient(0deg, #000000 0%, #ffffff 100%)';
		const ctrl = animateGradient(el, from, 'linear-gradient(90deg, #000000 0%, #ffffff 100%)', {
			duration: 500
		});
		expect(el.style.backgroundImage).toBe(normalized(from));
		ctrl.cancel();
	});

	it('snaps to target when stop counts differ', () => {
		const el = mount();
		const target = 'linear-gradient(90deg, #ff0000 0%, #008000 50%, #0000ff 100%)';
		const ctrl = animateGradient(el, 'linear-gradient(90deg, #ff0000, #0000ff)', target, {
			duration: 200
		});
		expect(el.style.backgroundImage).toBe(normalized(target));
		ctrl.cancel();
	});
});
