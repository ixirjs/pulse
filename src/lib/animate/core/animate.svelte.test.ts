/**
 * Real-browser behavior of animate(): multi-stop keyframe sequences and the
 * per-frame onUpdate hook. Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { animate } from './animate';
import { hasActiveTransforms } from '../properties/transform-tracker';

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
		expect(samples.length).toBeGreaterThan(2);
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

	it('does not re-arm when onUpdate cancels the controller', async () => {
		const node = mount();
		let calls = 0;
		const ctrl = animate(
			node,
			{ x: [0, 200] },
			{ duration: 300, onUpdate: () => (calls++, ctrl.cancel()) }
		);
		await new Promise((r) => setTimeout(r, 80));
		expect(calls).toBe(1);
	});
});

describe('animate() teardown', () => {
	it('releases transform ownership once, however often it is cancelled', () => {
		const node = mount();
		const first = animate(node, { x: [0, 100] }, { duration: 1000 });
		const second = animate(node, { x: [0, 200] }, { duration: 1000 });
		first.cancel();
		first.cancel();
		expect(hasActiveTransforms(node)).toBe(true);
		second.cancel();
		expect(hasActiveTransforms(node)).toBe(false);
	});
});

describe('animate() size keywords', () => {
	it("resolves 'auto' in the element's box-sizing, not its border box", () => {
		const parent = mount();
		parent.style.width = '200px';
		const child = document.createElement('div');
		child.style.cssText = 'box-sizing:content-box;padding:10px;border:2px solid;';
		parent.appendChild(child);
		const ctrl = animate(child, { width: [50, 'auto'] }, { duration: 1000 });
		const frames = ctrl.animations[0]!.effect!.getKeyframes();
		expect(frames.at(-1)!.width).toBe('176px'); // 200 - 2×10 padding - 2×2 border
		ctrl.cancel();
	});
});

describe('animate() terminal state', () => {
	it('settles where a reversed run ends, not on the last keyframe', async () => {
		const node = mount();
		await animate(node, { opacity: [0, 1] }, { duration: 60, direction: 'reverse' }).finished;
		expect(node.style.opacity).toBe('0');
	});

	it('settles at the start after an even number of alternating iterations', async () => {
		const node = mount();
		await animate(node, { x: [0, 100] }, { duration: 40, iterations: 2, direction: 'alternate' })
			.finished;
		expect(getComputedStyle(node).getPropertyValue('--motion-x').trim()).toBe('0px');
	});

	it("leaves no end state behind with fill: 'none'", async () => {
		const node = mount();
		await animate(node, { opacity: [0, 0.5] }, { duration: 60, fill: 'none' }).finished;
		expect(node.style.opacity).toBe('');
	});
});
