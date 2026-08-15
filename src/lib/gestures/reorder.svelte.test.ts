/**
 * reorder() drag-to-reorder, driven with synthetic PointerEvents in a real
 * browser. Runs in the `client` project.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { reorder } from './reorder';

let container: HTMLElement | null = null;

/** Stack three absolutely-positioned rows so their rects are deterministic. */
const setup = () => {
	container = document.createElement('div');
	container.style.position = 'relative';
	document.body.appendChild(container);
	const values = ['a', 'b', 'c'];
	const els = values.map((v, i) => {
		const el = document.createElement('div');
		el.textContent = v;
		el.style.position = 'absolute';
		el.style.top = `${i * 40}px`;
		el.style.left = '0';
		el.style.width = '100px';
		el.style.height = '40px';
		container!.appendChild(el);
		return el;
	});
	return { values, els };
};

afterEach(() => {
	vi.restoreAllMocks();
	container?.remove();
	container = null;
});

const pointer = (type: string, clientY: number): PointerEvent =>
	new PointerEvent(type, { pointerId: 1, clientY, clientX: 10, button: 0, bubbles: true });

describe('reorder()', () => {
	it('reorders when a row is dragged past a neighbor', () => {
		const { values, els } = setup();
		let order = [...values];
		const r = reorder<string>({ items: () => order, onReorder: (next) => (order = next) });
		els.forEach((el, i) => r.item(values[i]!)(el));

		// Drag row "a" (center 20) down by 50px → crosses into slot 1.
		els[0]!.dispatchEvent(pointer('pointerdown', 20));
		els[0]!.dispatchEvent(pointer('pointermove', 70));
		els[0]!.dispatchEvent(pointer('pointerup', 70));

		expect(order).toEqual(['b', 'a', 'c']);
	});

	it('composes drag offsets without replacing consumer transforms and restores owned styles', () => {
		const { values, els } = setup();
		let order = [...values];
		els[0]!.style.transform = 'rotate(12deg)';
		els[1]!.style.transition = 'opacity 100ms';
		const r = reorder<string>({ items: () => order, onReorder: (next) => (order = next) });
		els.forEach((el, i) => r.item(values[i]!)(el));

		els[0]!.dispatchEvent(pointer('pointerdown', 20));
		els[0]!.dispatchEvent(pointer('pointermove', 70));

		expect(els[0]!.style.transform).toBe('rotate(12deg)');
		expect(els[0]!.style.getPropertyValue('--motion-reorder-y')).toBe('50px');
		expect(Number.parseFloat(els[1]!.style.getPropertyValue('--motion-reorder-y'))).toBeCloseTo(
			-40
		);

		els[0]!.dispatchEvent(pointer('pointerup', 70));
		expect(order).toEqual(['b', 'a', 'c']);
		expect(els[0]!.style.transform).toBe('rotate(12deg)');
		expect(els[0]!.style.getPropertyValue('--motion-reorder-y')).toBe('');
		expect(els[1]!.style.transition).toBe('opacity 100ms');
	});

	it('does not reorder when the drag stays within its own slot', () => {
		const { values, els } = setup();
		let order = [...values];
		let calls = 0;
		const r = reorder<string>({
			items: () => order,
			onReorder: (next) => {
				order = next;
				calls++;
			}
		});
		els.forEach((el, i) => r.item(values[i]!)(el));

		els[0]!.dispatchEvent(pointer('pointerdown', 20));
		els[0]!.dispatchEvent(pointer('pointermove', 28)); // 8px < half a 40px slot
		els[0]!.dispatchEvent(pointer('pointerup', 28));

		expect(calls).toBe(0);
		expect(order).toEqual(['a', 'b', 'c']);
	});

	it('moves a row to the last slot when dragged far enough', () => {
		const { values, els } = setup();
		let order = [...values];
		const r = reorder<string>({ items: () => order, onReorder: (next) => (order = next) });
		els.forEach((el, i) => r.item(values[i]!)(el));

		els[0]!.dispatchEvent(pointer('pointerdown', 20));
		els[0]!.dispatchEvent(pointer('pointermove', 120)); // delta 100 / stride 40 ≈ 2.5 → clamp 2
		els[0]!.dispatchEvent(pointer('pointerup', 120));

		expect(order).toEqual(['b', 'c', 'a']);
	});

	it('uses actual slot centers for variable-size rows', () => {
		const { values, els } = setup();
		els[0]!.style.height = '20px';
		els[1]!.style.top = '20px';
		els[1]!.style.height = '100px';
		els[2]!.style.top = '120px';
		let order = [...values];
		const r = reorder<string>({ items: () => order, onReorder: (next) => (order = next) });
		els.forEach((el, i) => r.item(values[i]!)(el));

		// The second row's center is 70px, not the old average-stride slot at 80px.
		els[0]!.dispatchEvent(pointer('pointerdown', 10));
		els[0]!.dispatchEvent(pointer('pointermove', 60));
		els[0]!.dispatchEvent(pointer('pointerup', 60));

		expect(order).toEqual(['b', 'a', 'c']);
	});

	it('supports recreated or duplicate values through a stable getKey', () => {
		const { els } = setup();
		let order = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
		const r = reorder({
			items: () => order,
			getKey: (item) => item.id,
			onReorder: (next) => (order = next)
		});
		order.forEach((item, i) => r.item(item)(els[i]!));

		els[0]!.dispatchEvent(pointer('pointerdown', 20));
		els[0]!.dispatchEvent(pointer('pointermove', 70));
		els[0]!.dispatchEvent(pointer('pointerup', 70));

		expect(order.map((item) => item.id)).toEqual(['b', 'a', 'c']);
	});

	it('cancels an active drag and restores owned styles on detach', () => {
		const { values, els } = setup();
		let order = [...values];
		const r = reorder<string>({ items: () => order, onReorder: (next) => (order = next) });
		const cleanup = r.item(values[0]!)(els[0]!);
		els.slice(1).forEach((el, i) => r.item(values[i + 1]!)(el));

		els[0]!.dispatchEvent(pointer('pointerdown', 20));
		els[0]!.dispatchEvent(pointer('pointermove', 70));
		cleanup?.();

		expect(els[0]!.style.getPropertyValue('--motion-reorder-y')).toBe('');
		expect(order).toEqual(['a', 'b', 'c']);
	});

	it('cancels the scheduled FLIP handoff when detached after drop', () => {
		const { values, els } = setup();
		let order = [...values];
		const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
		const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame');
		const r = reorder<string>({ items: () => order, onReorder: (next) => (order = next) });
		const cleanup = r.item(values[0]!)(els[0]!);
		els.slice(1).forEach((el, i) => r.item(values[i + 1]!)(el));

		els[0]!.dispatchEvent(pointer('pointerdown', 20));
		els[0]!.dispatchEvent(pointer('pointermove', 70));
		els[0]!.dispatchEvent(pointer('pointerup', 70));
		cleanup?.();

		expect(order).toEqual(['b', 'a', 'c']);
		expect(requestFrame).toHaveBeenCalledTimes(1);
		expect(cancelFrame).toHaveBeenCalledWith(42);
	});

	it('detaches cleanly (cleanup removes the listener)', () => {
		const { values, els } = setup();
		let order = [...values];
		const r = reorder<string>({ items: () => order, onReorder: (next) => (order = next) });
		const cleanup = r.item(values[0]!)(els[0]!);
		els.slice(1).forEach((el, i) => r.item(values[i + 1]!)(el));
		cleanup?.();

		// After cleanup, a pointerdown on the detached row starts no drag.
		els[0]!.dispatchEvent(pointer('pointerdown', 20));
		els[0]!.dispatchEvent(pointer('pointermove', 120));
		els[0]!.dispatchEvent(pointer('pointerup', 120));
		expect(order).toEqual(['a', 'b', 'c']);
	});
});
