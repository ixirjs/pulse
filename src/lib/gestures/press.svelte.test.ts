/**
 * pressable() attachment in a real browser. Runs in the `client` project.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { pressable } from './press';

let node: HTMLElement | null = null;

const mount = (): HTMLElement => {
	const el = document.createElement('button');
	el.style.cssText = 'position:fixed;top:0;left:0;width:100px;height:100px';
	document.body.appendChild(el);
	node = el;
	return el;
};

afterEach(() => {
	node?.remove();
	node = null;
});

const pointer = (type: string, x = 10, y = 10): PointerEvent =>
	new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, button: 0, bubbles: true });

describe('pressable()', () => {
	it('fires start → end → press for a press released over the element', () => {
		const el = mount();
		const onPressStart = vi.fn();
		const onPressEnd = vi.fn();
		const onPress = vi.fn();
		const cleanup = pressable({ onPressStart, onPressEnd, onPress })(el);

		el.dispatchEvent(pointer('pointerdown'));
		expect(onPressStart).toHaveBeenCalledOnce();

		el.dispatchEvent(pointer('pointerup'));
		expect(onPressEnd).toHaveBeenCalledWith(el, true);
		expect(onPress).toHaveBeenCalledOnce();
		cleanup?.();
	});

	it('cancels without firing onPress', () => {
		const el = mount();
		const onPressEnd = vi.fn();
		const onPress = vi.fn();
		const cleanup = pressable({ onPressEnd, onPress })(el);

		el.dispatchEvent(pointer('pointerdown'));
		el.dispatchEvent(pointer('pointercancel'));

		expect(onPressEnd).toHaveBeenCalledWith(el, false);
		expect(onPress).not.toHaveBeenCalled();
		cleanup?.();
	});

	it('ignores non-primary buttons', () => {
		const el = mount();
		const onPressStart = vi.fn();
		const cleanup = pressable({ onPressStart })(el);

		el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 2, bubbles: true }));
		expect(onPressStart).not.toHaveBeenCalled();
		cleanup?.();
	});

	it('fires onLongPress after the delay and suppresses the click', () => {
		vi.useFakeTimers();
		try {
			const el = mount();
			const onLongPress = vi.fn();
			const onPress = vi.fn();
			const cleanup = pressable({ onLongPress, onPress, longPressDelay: 500 })(el);

			el.dispatchEvent(pointer('pointerdown'));
			vi.advanceTimersByTime(500);
			expect(onLongPress).toHaveBeenCalledOnce();

			el.dispatchEvent(pointer('pointerup'));
			// A long press is its own gesture — the release is not also a click.
			expect(onPress).not.toHaveBeenCalled();
			cleanup?.();
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not fire onLongPress when released early', () => {
		vi.useFakeTimers();
		try {
			const el = mount();
			const onLongPress = vi.fn();
			const cleanup = pressable({ onLongPress, longPressDelay: 500 })(el);

			el.dispatchEvent(pointer('pointerdown'));
			vi.advanceTimersByTime(200);
			el.dispatchEvent(pointer('pointerup'));
			vi.advanceTimersByTime(500);
			expect(onLongPress).not.toHaveBeenCalled();
			cleanup?.();
		} finally {
			vi.useRealTimers();
		}
	});

	it('fires onDoubleTap for two quick presses', () => {
		const el = mount();
		const onDoubleTap = vi.fn();
		const cleanup = pressable({ onDoubleTap, doubleTapDelay: 1000 })(el);

		el.dispatchEvent(pointer('pointerdown'));
		el.dispatchEvent(pointer('pointerup'));
		el.dispatchEvent(pointer('pointerdown'));
		el.dispatchEvent(pointer('pointerup'));

		expect(onDoubleTap).toHaveBeenCalledOnce();
		cleanup?.();
	});
});
