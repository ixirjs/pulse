/**
 * Real-browser behavior of animate(): multi-stop keyframe sequences and the
 * per-frame onUpdate hook. Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { animate } from './animate';

let el: HTMLElement | null = null;

const mount = (): HTMLElement => {
	el = document.createElement('div');
	document.body.appendChild(el);
	return el;
};

afterEach(() => {
	el?.remove();
	el = null;
});

describe('animate() multi-stop sequences', () => {
	it('passes a > 2 stop sequence to WAAPI as N keyframes', () => {
		const node = mount();
		const ctrl = animate(node, { opacity: [0, 1, 0.2, 1] }, { duration: 100 });
		const frames = (ctrl.animations[0]!.effect as KeyframeEffect).getKeyframes();
		expect(frames).toHaveLength(4);
		expect(frames.map((f) => f.opacity)).toEqual(['0', '1', '0.2', '1']);
		ctrl.cancel();
	});

	it('honors explicit offsets on a values config', () => {
		const node = mount();
		const ctrl = animate(
			node,
			{ opacity: { values: [0, 1, 0.5], offset: [0, 0.8, 1] } },
			{ duration: 100 }
		);
		const offsets = (ctrl.animations[0]!.effect as KeyframeEffect)
			.getKeyframes()
			.map((f) => f.offset);
		expect(offsets).toEqual([0, 0.8, 1]);
		ctrl.cancel();
	});

	it('settles on the final stop', async () => {
		const node = mount();
		await animate(node, { opacity: [0, 1, 0.25] }, { duration: 60 }).finished;
		expect(parseFloat(getComputedStyle(node).opacity)).toBeCloseTo(0.25, 1);
	});
});

describe('animate() onUpdate', () => {
	it('reports increasing progress each frame and settles at 1', async () => {
		const node = mount();
		const samples: number[] = [];
		await animate(node, { x: [0, 200] }, { duration: 120, onUpdate: (p) => samples.push(p) })
			.finished;
		expect(samples.length).toBeGreaterThan(3);
		// Monotonic non-decreasing progress.
		for (let i = 1; i < samples.length; i++) {
			expect(samples[i]!).toBeGreaterThanOrEqual(samples[i - 1]!);
		}
		expect(samples.at(-1)!).toBeCloseTo(1, 1);
	});

	it('stops firing after cancel', async () => {
		const node = mount();
		let calls = 0;
		const ctrl = animate(node, { x: [0, 200] }, { duration: 300, onUpdate: () => calls++ });
		await new Promise((r) => requestAnimationFrame(r));
		ctrl.cancel();
		const after = calls;
		await new Promise((r) => setTimeout(r, 50));
		expect(calls).toBe(after);
	});
});
