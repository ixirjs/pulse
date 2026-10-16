/**
 * scroll() attachment in a real browser. Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { animate } from '../animate/index';
import { scroll } from './scroll';

let node: HTMLElement | null = null;

const mount = (): HTMLElement => {
	const el = document.createElement('div');
	el.style.cssText = 'position:absolute;top:200px;left:0;width:50px;height:50px';
	document.body.appendChild(el);
	node = el;
	return el;
};

afterEach(() => {
	node?.remove();
	node = null;
});

describe('scroll()', () => {
	it('measures progress from the resting box, not the transform it drives', () => {
		const el = mount();
		const plain: number[] = [];
		scroll({ onProgress: (p) => plain.push(p) })(el)?.();

		const driven: number[] = [];
		const cleanup = scroll({
			animation: (e) => animate(e, { y: [400, 0] }, { duration: 1000 }),
			onProgress: (p) => driven.push(p)
		})(el);
		expect(driven[0]).toBeCloseTo(plain[0]!, 5);
		cleanup?.();
	});
});
