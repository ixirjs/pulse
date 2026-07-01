/**
 * inView() attachment in a real browser (IntersectionObserver).
 * Runs in the `client` project.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { inView } from './in-view';

let node: HTMLElement | null = null;

const mount = (): HTMLElement => {
	const el = document.createElement('div');
	el.style.cssText = 'position:fixed;top:0;left:0;width:50px;height:50px';
	document.body.appendChild(el);
	node = el;
	return el;
};

afterEach(() => {
	node?.remove();
	node = null;
});

describe('inView()', () => {
	it('fires onEnter for an element already in the viewport', async () => {
		const el = mount();
		let entered = false;
		const cleanup = inView({ onEnter: () => (entered = true) })(el);
		await vi.waitFor(() => expect(entered).toBe(true));
		cleanup?.();
	});

	it('stops observing after the first enter when once is set', async () => {
		const el = mount();
		const onEnter = vi.fn();
		const cleanup = inView({ once: true, onEnter })(el);
		await vi.waitFor(() => expect(onEnter).toHaveBeenCalledOnce());
		cleanup?.();
	});
});
