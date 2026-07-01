/**
 * reorder() drag-to-reorder, driven with synthetic PointerEvents in a real
 * browser. Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
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
