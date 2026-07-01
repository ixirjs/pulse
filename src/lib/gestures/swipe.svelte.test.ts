/**
 * swipeable() attachment in a real browser. Runs in the `client` project.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { swipeable } from './swipe';

let node: HTMLElement | null = null;

const mount = (): HTMLElement => {
	const el = document.createElement('div');
	el.style.cssText = 'position:fixed;top:0;left:0;width:200px;height:200px';
	document.body.appendChild(el);
	node = el;
	return el;
};

afterEach(() => {
	node?.remove();
	node = null;
});

const pointer = (type: string, x: number, y: number): PointerEvent =>
	new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, button: 0, bubbles: true });

describe('swipeable()', () => {
	it('reports a horizontal swipe past the distance threshold', () => {
		const el = mount();
		const onSwipe = vi.fn();
		const cleanup = swipeable({ onSwipe })(el);

		el.dispatchEvent(pointer('pointerdown', 0, 0));
		el.dispatchEvent(pointer('pointermove', 80, 5));
		el.dispatchEvent(pointer('pointerup', 80, 5));

		expect(onSwipe).toHaveBeenCalledOnce();
		expect(onSwipe.mock.calls[0][0]).toBe('right');
		cleanup?.();
	});

	it('does not fire below the distance and velocity thresholds', () => {
		const el = mount();
		const onSwipe = vi.fn();
		const cleanup = swipeable({ onSwipe })(el);

		// No move events → velocity stays 0; the 10px travel is under threshold.
		el.dispatchEvent(pointer('pointerdown', 0, 0));
		el.dispatchEvent(pointer('pointerup', 10, 0));

		expect(onSwipe).not.toHaveBeenCalled();
		cleanup?.();
	});

	it('ignores cross-axis travel when locked to an axis', () => {
		const el = mount();
		const onSwipe = vi.fn();
		const cleanup = swipeable({ onSwipe, axis: 'y' })(el);

		// A long horizontal drag must not register on a y-locked swipe.
		el.dispatchEvent(pointer('pointerdown', 0, 0));
		el.dispatchEvent(pointer('pointerup', 120, 4));

		expect(onSwipe).not.toHaveBeenCalled();
		cleanup?.();
	});
});
