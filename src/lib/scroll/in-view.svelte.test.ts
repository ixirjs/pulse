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

	it('gates on the requested amount, not on any overlap', () => {
		// Spec-conformant engines (Firefox) report `isIntersecting: true` at any
		// overlap, even below the threshold; Chromium doesn't. Feed spec entries.
		let report!: (ratio: number) => void;
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				constructor(cb: IntersectionObserverCallback) {
					report = (ratio) =>
						cb(
							[
								{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry
							],
							this as unknown as IntersectionObserver
						);
				}
				observe() {}
				disconnect() {}
			}
		);
		const onEnter = vi.fn();
		const onLeave = vi.fn();
		const cleanup = inView({ amount: 0.5, onEnter, onLeave })(mount());
		report(0.2);
		expect(onEnter).not.toHaveBeenCalled();
		report(0.6);
		expect(onEnter).toHaveBeenCalledOnce();
		report(0.3);
		expect(onLeave).toHaveBeenCalledOnce();
		cleanup?.();
		vi.unstubAllGlobals();
	});
});
