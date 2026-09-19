/**
 * draggable() attachment in a real browser. The attachment uses no runes, so
 * it can be invoked directly on a DOM node. Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { draggable } from './draggable';

let node: HTMLElement | null = null;

const mount = (): HTMLElement => {
	const el = document.createElement('div');
	el.style.cssText = 'position:fixed;top:0;left:0;width:100px;height:100px';
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

describe('draggable()', () => {
	it('writes --motion-x / --motion-y as the pointer moves', () => {
		const el = mount();
		const cleanup = draggable()(el);

		el.dispatchEvent(pointer('pointerdown', 0, 0));
		el.dispatchEvent(pointer('pointermove', 50, 30));

		expect(el.style.getPropertyValue('--motion-x')).toBe('50px');
		expect(el.style.getPropertyValue('--motion-y')).toBe('30px');
		cleanup?.();
	});

	it('locks to a single axis', () => {
		const el = mount();
		const cleanup = draggable({ axis: 'x' })(el);

		el.dispatchEvent(pointer('pointerdown', 0, 0));
		el.dispatchEvent(pointer('pointermove', 40, 40));

		expect(el.style.getPropertyValue('--motion-x')).toBe('40px');
		expect(el.style.getPropertyValue('--motion-y')).toBe('');
		expect(el.style.touchAction).toBe('pan-y');
		cleanup?.();
	});

	it('hard-clamps to constraints during drag', () => {
		const el = mount();
		const cleanup = draggable({ constraints: { left: -10, right: 20 } })(el);

		el.dispatchEvent(pointer('pointerdown', 0, 0));
		el.dispatchEvent(pointer('pointermove', 100, 0));

		expect(el.style.getPropertyValue('--motion-x')).toBe('20px');
		cleanup?.();
	});

	it('restores touch-action on cleanup', () => {
		const el = mount();
		el.style.touchAction = 'auto';
		const cleanup = draggable()(el);
		expect(el.style.touchAction).toBe('none');
		cleanup?.();
		expect(el.style.touchAction).toBe('auto');
	});

	it('holds a compositor layer for the drag and releases it once settled', async () => {
		const el = mount();
		el.style.setProperty('will-change', 'opacity');
		const cleanup = draggable({ snapToOrigin: true })(el);

		el.dispatchEvent(pointer('pointerdown', 0, 0));
		el.dispatchEvent(pointer('pointermove', 50, 30));
		expect(el.style.getPropertyValue('will-change')).toBe('translate, scale, rotate');

		el.dispatchEvent(pointer('pointerup', 50, 30));
		// The flick keeps writing after the pointer is gone, so the layer outlives
		// pointerup and is handed back only when the spring stops.
		expect(el.style.getPropertyValue('will-change')).toBe('translate, scale, rotate');
		await expect
			.poll(() => el.style.getPropertyValue('will-change'), { timeout: 3000 })
			.toBe('opacity');
		cleanup?.();
	});
});
