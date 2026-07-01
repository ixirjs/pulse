/**
 * wheelable() attachment in a real browser. Runs in the `client` project.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { wheelable } from './wheel';

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

const wheel = (deltaY: number, opts: Partial<WheelEventInit> = {}): WheelEvent =>
	new WheelEvent('wheel', {
		deltaY,
		clientX: 100,
		clientY: 100,
		bubbles: true,
		cancelable: true,
		...opts
	});

describe('wheelable()', () => {
	it('zooms in on negative deltaY and writes --motion-scale', () => {
		const el = mount();
		const onMove = vi.fn();
		const cleanup = wheelable({ onMove, speed: 0.01 })(el);

		el.dispatchEvent(wheel(-100));
		const info = onMove.mock.calls.at(-1)![0];
		// scale = exp(-(-100) * 0.01) = exp(1) ≈ 2.718
		expect(info.scale).toBeCloseTo(Math.E, 3);
		expect(el.style.getPropertyValue('--motion-scale')).not.toBe('');
		cleanup?.();
	});

	it('fires start once and clamps to scaleBounds', () => {
		const el = mount();
		const onStart = vi.fn();
		const onMove = vi.fn();
		const cleanup = wheelable({ onStart, onMove, speed: 0.01, scaleBounds: { max: 1.5 } })(el);

		el.dispatchEvent(wheel(-100));
		el.dispatchEvent(wheel(-100));
		expect(onStart).toHaveBeenCalledOnce();
		expect(onMove.mock.calls.at(-1)![0].scale).toBe(1.5);
		cleanup?.();
	});

	it('smooths the applied scale toward the target instead of snapping', () => {
		const el = mount();
		// Default `smooth` springs --motion-scale toward the target across
		// frames, so it lags the logical scale on the tick itself.
		const cleanup = wheelable({ speed: 0.01 })(el);

		el.dispatchEvent(wheel(-100));
		const applied = Number(el.style.getPropertyValue('--motion-scale'));
		// Target is e ≈ 2.718; the spring hasn't run a frame yet, so the
		// rendered value still trails well below it.
		expect(applied).toBeLessThan(Math.E);
		cleanup?.();
	});

	it('writes the raw target each tick when smooth is disabled', () => {
		const el = mount();
		const cleanup = wheelable({ speed: 0.01, smooth: false })(el);

		el.dispatchEvent(wheel(-100));
		expect(Number(el.style.getPropertyValue('--motion-scale'))).toBeCloseTo(Math.E, 3);
		cleanup?.();
	});

	it('ignores plain wheel events when requireCtrl is set', () => {
		const el = mount();
		const onMove = vi.fn();
		const cleanup = wheelable({ onMove, requireCtrl: true })(el);

		el.dispatchEvent(wheel(-100));
		expect(onMove).not.toHaveBeenCalled();
		el.dispatchEvent(wheel(-100, { ctrlKey: true }));
		expect(onMove).toHaveBeenCalledOnce();
		cleanup?.();
	});
});
