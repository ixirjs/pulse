import { afterEach, describe, expect, it } from 'vitest';
import { animate } from './animate';

const nodes: HTMLElement[] = [];
const mount = (css = ''): HTMLElement => {
	const el = document.createElement('div');
	el.style.cssText = `position:fixed;top:50px;left:50px;width:100px;height:80px;${css}`;
	document.body.appendChild(el);
	nodes.push(el);
	return el;
};
afterEach(() => {
	for (const n of nodes.splice(0)) n.remove();
});

const FLIP = { flipX: [120, 0], flipY: [40, 0], flipScaleX: [0.5, 1], flipScaleY: [0.25, 1] };
const rect = (el: Element) => {
	const r = el.getBoundingClientRect();
	return [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 100) / 100);
};

describe('fold equivalence', () => {
	it('renders the same frame as the variable path', () => {
		for (const css of ['', 'transform-origin:0 0;', '--motion-x:15px;--motion-scale:1.5;']) {
			const a = mount(css);
			const b = mount(css);
			const folded = animate(a, FLIP as never, { duration: 400, easing: (t: number) => t });
			const vars = animate(b, FLIP as never, { duration: 400, easing: (t: number) => t });
			// A second animation demotes b onto the variable path.
			const nudge = animate(b, { rotate: [0, 0] }, { duration: 400 });
			for (const c of [folded, vars]) {
				c.pause();
				c.seek(150);
			}
			expect(rect(a)).toEqual(rect(b));
			folded.cancel();
			vars.cancel();
			nudge.cancel();
		}
	});

	it('stop() freezes a folded animation where it is on screen', () => {
		const el = mount();
		const c = animate(el, FLIP as never, { duration: 400, easing: (t: number) => t });
		c.pause();
		c.seek(100);
		const before = rect(el);
		c.stop();
		expect(rect(el)).toEqual(before);
		expect(parseFloat(el.style.getPropertyValue('--flip-x'))).toBeCloseTo(90, 1);
	});

	it('lands on the end state and cleans up', async () => {
		const el = mount();
		const resting = rect(el);
		const c = animate(el, { ...FLIP, width: [50, 100] } as never, { duration: 60 });
		expect(c.animations).toHaveLength(2);
		await c.finished;
		expect(rect(el)).toEqual(resting);
		expect(el.style.getPropertyValue('will-change')).toBe('');
		expect(el.getAnimations()).toHaveLength(0);
	});

	it('inline writes to a motion var show up mid-fold', async () => {
		const el = mount();
		const c = animate(el, { flipX: [0, 0] }, { duration: 400 });
		const before = rect(el);
		el.style.setProperty('--motion-x', '25px');
		await new Promise((r) => setTimeout(r, 0));
		expect(rect(el)[0]).toBeCloseTo(before[0]! + 25, 1);
		c.cancel();
	});
});
