/**
 * Rapid re-trigger behaviour: reordering faster than a FLIP settles must keep
 * every item inside the row it belongs to. An in-flight transform is an offset
 * from the *old* resting box, so an interrupting run that treats the live
 * visual rect as its `from` flings the element a full slot out of place.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { flip } from './index';

const GAP = 10;
const WIDTH = 40;
const SLOT = WIDTH + GAP;
const COUNT = 5;

let dispose: (() => void) | null = null;
let container: HTMLDivElement | null = null;

const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
/** rAF then a task tick — samples what the frame actually painted, after every
 * rAF callback (including flip's frame batch) has run. */
const paintedFrame = async (): Promise<void> => {
	await frame();
	await new Promise((r) => setTimeout(r, 0));
};

afterEach(() => {
	dispose?.();
	dispose = null;
	container?.remove();
	container = null;
});

describe('reordering faster than the animation settles', () => {
	it('never pushes an item outside the row, and lands on the layout slots', async () => {
		container = document.createElement('div');
		Object.assign(container.style, {
			position: 'fixed',
			top: '0px',
			left: '0px',
			display: 'flex',
			gap: `${GAP}px`
		});
		document.body.appendChild(container);

		const boxes = Array.from({ length: COUNT }, () => {
			const box = document.createElement('div');
			Object.assign(box.style, { width: `${WIDTH}px`, height: '20px' });
			container!.appendChild(box);
			return box;
		});

		dispose = $effect.root(() => {
			for (const box of boxes) flip({ duration: 300 })(box);
		});
		await paintedFrame();

		const lastSlot = (COUNT - 1) * SLOT;
		const positions = (): number[] => boxes.map((b) => b.getBoundingClientRect().x);
		const offRow: number[] = [];

		// Rotate the row every other frame — far faster than any run settles.
		for (let i = 0; i < 6; i++) {
			container.appendChild(container.firstElementChild!);
			for (let f = 0; f < 2; f++) {
				await paintedFrame();
				offRow.push(...positions().filter((x) => x < -1 || x > lastSlot + 1));
			}
		}
		expect(offRow).toEqual([]);

		await Promise.all(
			boxes.flatMap((b) => b.getAnimations().map((a) => a.finished.catch(() => undefined)))
		);
		await paintedFrame();

		const resting = [...container.children].map((c) => c.getBoundingClientRect().x);
		expect(resting).toEqual(Array.from({ length: COUNT }, (_, i) => i * SLOT));
	});
});
