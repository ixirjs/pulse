/**
 * moveable() attachment in a real browser. Runs in the `client` project.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { moveable } from './move';

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

const pointer = (type: string, x: number, y: number, pointerType = 'mouse'): PointerEvent =>
	new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, pointerType, bubbles: true });

describe('moveable()', () => {
	it('reports position normalised from the element centre', () => {
		const el = mount();
		const onMove = vi.fn();
		const cleanup = moveable({ onMove })(el);

		// Centre of a 200×200 box at the origin is (100, 100).
		el.dispatchEvent(pointer('pointermove', 150, 100));
		const info = onMove.mock.calls.at(-1)![0];
		expect(info.nx).toBeCloseTo(0.5, 5);
		expect(info.ny).toBeCloseTo(0, 5);
		expect(info.localX).toBeCloseTo(150, 5);
		cleanup?.();
	});

	it('fires start on enter and end on leave', () => {
		const el = mount();
		const onMoveStart = vi.fn();
		const onMoveEnd = vi.fn();
		const cleanup = moveable({ onMoveStart, onMoveEnd })(el);

		el.dispatchEvent(pointer('pointerenter', 100, 100));
		expect(onMoveStart).toHaveBeenCalledOnce();
		el.dispatchEvent(pointer('pointerleave', 100, 100));
		expect(onMoveEnd).toHaveBeenCalledOnce();
		cleanup?.();
	});

	it('writes a magnetic --motion-x offset when applyTransform is true', () => {
		const el = mount();
		const cleanup = moveable({ applyTransform: true, strength: 0.3 })(el);

		// 50px right of centre × 0.3 = 15px pull, written synchronously via jump().
		el.dispatchEvent(pointer('pointermove', 150, 100));
		expect(el.style.getPropertyValue('--motion-x')).toBe('15px');
		cleanup?.();
	});

	it('ignores touch pointers by default', () => {
		const el = mount();
		const onMove = vi.fn();
		const cleanup = moveable({ onMove })(el);

		el.dispatchEvent(pointer('pointermove', 150, 100, 'touch'));
		expect(onMove).not.toHaveBeenCalled();
		cleanup?.();
	});

	it('holds a compositor layer from pointerenter through the spring back', async () => {
		const el = mount();
		const cleanup = moveable({ applyTransform: true })(el);

		el.dispatchEvent(pointer('pointerenter', 150, 100));
		expect(el.style.getPropertyValue('will-change')).toBe('translate, scale, rotate');

		el.dispatchEvent(pointer('pointerleave', 150, 100));
		await expect.poll(() => el.style.getPropertyValue('will-change'), { timeout: 3000 }).toBe('');
		cleanup?.();
	});
});
