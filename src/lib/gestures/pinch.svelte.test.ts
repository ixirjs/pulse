/**
 * pinchable() attachment in a real browser. Runs in the `client` project.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { pinchable } from './pinch';

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

const pointer = (type: string, id: number, x: number, y: number): PointerEvent =>
	new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, button: 0, bubbles: true });

describe('pinchable()', () => {
	it('begins on the second pointer and reports scale ~2 when distance doubles', () => {
		const el = mount();
		const onStart = vi.fn();
		const onMove = vi.fn();
		const cleanup = pinchable({ onStart, onMove })(el);

		// First pointer down — gesture not yet started.
		el.dispatchEvent(pointer('pointerdown', 1, 0, 0));
		expect(onStart).not.toHaveBeenCalled();

		// Second pointer down at distance 100 — gesture begins.
		el.dispatchEvent(pointer('pointerdown', 2, 100, 0));
		expect(onStart).toHaveBeenCalledOnce();

		// Move second pointer to distance 200 — scale should double.
		el.dispatchEvent(pointer('pointermove', 2, 200, 0));
		expect(onMove).toHaveBeenCalled();
		const info = onMove.mock.calls.at(-1)![0];
		expect(info.scale).toBeCloseTo(2, 5);

		cleanup?.();
	});

	it('reports accumulated rotation in degrees', () => {
		const el = mount();
		const onMove = vi.fn();
		const cleanup = pinchable({ onMove })(el);

		el.dispatchEvent(pointer('pointerdown', 1, 0, 0));
		el.dispatchEvent(pointer('pointerdown', 2, 100, 0));
		// Rotate second pointer to straight down: angle 0deg -> 90deg.
		el.dispatchEvent(pointer('pointermove', 2, 0, 100));

		const info = onMove.mock.calls.at(-1)![0];
		expect(info.rotation).toBeCloseTo(90, 5);
		cleanup?.();
	});

	it('writes --motion-scale when applyTransform is true', () => {
		const el = mount();
		const cleanup = pinchable({})(el);

		el.dispatchEvent(pointer('pointerdown', 1, 0, 0));
		el.dispatchEvent(pointer('pointerdown', 2, 100, 0));
		el.dispatchEvent(pointer('pointermove', 2, 200, 0));

		expect(el.style.getPropertyValue('--motion-scale')).toBe('2');
		cleanup?.();
	});

	it('clamps scale to scaleBounds', () => {
		const el = mount();
		const onMove = vi.fn();
		const cleanup = pinchable({ onMove, scaleBounds: { max: 1.5 } })(el);

		el.dispatchEvent(pointer('pointerdown', 1, 0, 0));
		el.dispatchEvent(pointer('pointerdown', 2, 100, 0));
		el.dispatchEvent(pointer('pointermove', 2, 400, 0));

		const info = onMove.mock.calls.at(-1)![0];
		expect(info.scale).toBe(1.5);
		cleanup?.();
	});

	it('ends the gesture when a pointer lifts', () => {
		const el = mount();
		const onEnd = vi.fn();
		const onMove = vi.fn();
		const cleanup = pinchable({ onEnd, onMove })(el);

		el.dispatchEvent(pointer('pointerdown', 1, 0, 0));
		el.dispatchEvent(pointer('pointerdown', 2, 100, 0));
		el.dispatchEvent(pointer('pointerup', 2, 100, 0));
		expect(onEnd).toHaveBeenCalledOnce();

		onMove.mockClear();
		// Moving the remaining pointer must not report after the gesture ended.
		el.dispatchEvent(pointer('pointermove', 1, 50, 50));
		expect(onMove).not.toHaveBeenCalled();
		cleanup?.();
	});

	it('holds a compositor layer while both pointers are down', () => {
		const el = mount();
		const cleanup = pinchable()(el);

		el.dispatchEvent(pointer('pointerdown', 1, 0, 0));
		expect(el.style.getPropertyValue('will-change')).toBe('');

		// The gesture, and the layer, begin on the second pointer.
		el.dispatchEvent(pointer('pointerdown', 2, 100, 0));
		expect(el.style.getPropertyValue('will-change')).toBe('translate, scale, rotate');

		el.dispatchEvent(pointer('pointerup', 2, 100, 0));
		expect(el.style.getPropertyValue('will-change')).toBe('');
		cleanup?.();
	});
});
