/**
 * Presence transitions that read live box metrics (need a real DOM/layout).
 * Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { fly, scale, size } from './transitions';

let node: HTMLElement | null = null;

const mount = (apply: (el: HTMLElement) => void): HTMLElement => {
	node = document.createElement('div');
	node.style.width = '200px';
	node.style.height = '100px';
	node.style.padding = '10px';
	apply(node);
	document.body.appendChild(node);
	return node;
};

afterEach(() => {
	node?.remove();
	node = null;
});

describe('size()', () => {
	it('collapses height (and vertical box-spacing) at t=0, restores at t=1', () => {
		const el = mount(() => {});
		const cfg = size(el);
		const at0 = cfg.css!(0, 1);
		const at1 = cfg.css!(1, 0);
		expect(at0).toContain('height: 0px');
		expect(at0).toContain('padding-top: 0px');
		expect(at0).toContain('overflow: hidden');
		expect(at1).toContain('height: 100px');
		expect(at1).toContain('padding-top: 10px');
		// Default axis 'y' leaves width alone (border-*-width declarations aside).
		expect(at0).not.toMatch(/(^|; )width:/);
	});

	it("axis 'x' collapses width instead of height", () => {
		const el = mount(() => {});
		const cfg = size(el, { axis: 'x' });
		const at0 = cfg.css!(0, 1);
		expect(at0).toContain('width: 0px');
		expect(at0).toContain('padding-left: 0px');
		expect(at0).not.toMatch(/(^|; )height:/);
	});

	it("axis 'both' collapses width and height", () => {
		const el = mount(() => {});
		const cfg = size(el, { axis: 'both' });
		const at0 = cfg.css!(0, 1);
		expect(at0).toContain('width: 0px');
		expect(at0).toContain('height: 0px');
	});

	it('respects a non-zero start fraction', () => {
		const el = mount(() => {});
		const cfg = size(el, { start: 0.5 });
		// At t=0 the element sits at half its natural height.
		expect(cfg.css!(0, 1)).toContain('height: 50px');
	});

	it('only animates opacity when the opacity param is given', () => {
		const el = mount(() => {});
		expect(size(el).css!(0, 1)).not.toContain('opacity:');
		expect(size(el, { opacity: 0 }).css!(0, 1)).toContain('opacity: 0');
	});

	it('derives a spring duration when spring is set', () => {
		const el = mount(() => {});
		const cfg = size(el, { spring: { stiffness: 200, damping: 20 } });
		expect(cfg.duration).toBeGreaterThan(0);
	});
});

describe('fly() with width/height', () => {
	it('translates only by default — no size declarations', () => {
		const el = mount(() => {});
		const css = fly(el, { y: 16 }).css!(0, 1);
		expect(css).toContain('transform: translate(0px, 16px)');
		expect(css).not.toContain('width:');
		expect(css).not.toContain('height:');
	});

	it('tweens width from the start px to the natural width alongside the travel', () => {
		const el = mount(() => {}); // natural width 200px
		const cfg = fly(el, { x: 24, width: 0 });
		const at0 = cfg.css!(0, 1);
		const at1 = cfg.css!(1, 0);
		// Travel + collapsed width at t=0, settled at t=1.
		expect(at0).toContain('transform: translate(24px, 0px)');
		expect(at0).toContain('width: 0px');
		expect(at0).toContain('overflow: hidden');
		expect(at1).toContain('width: 200px');
		expect(at1).toContain('transform: translate(0px, 0px)');
	});

	it('collapses horizontal padding too, so the box fully closes (no padding floor)', () => {
		// Element has 10px padding all round; at width 0 the padding must also be 0,
		// otherwise box-sizing: border-box floors the footprint at the padding.
		const el = mount(() => {}); // padding: 10px from setup()
		const at0 = fly(el, { width: 0 }).css!(0, 1);
		const at1 = fly(el, { width: 0 }).css!(1, 0);
		expect(at0).toContain('padding-left: 0px');
		expect(at0).toContain('padding-right: 0px');
		expect(at1).toContain('padding-left: 10px');
		// Vertical padding is untouched on a width-only collapse.
		expect(at0).not.toContain('padding-top:');
	});

	it('tweens height independently of width', () => {
		const el = mount(() => {}); // natural height 100px
		const at0 = fly(el, { y: 8, height: 40 }).css!(0, 1);
		expect(at0).toContain('height: 40px');
		expect(at0).not.toMatch(/(^|; )width:/);
	});

	it('resolves a CSS-length start (rem) to px', () => {
		// 1rem = 16px by default; start width should resolve to 32px.
		const el = mount(() => {});
		expect(fly(el, { width: '2rem' }).css!(0, 1)).toContain('width: 32px');
	});

	it('resolves a percentage start against the element context', () => {
		// Parent 300px wide → 50% resolves to 150px.
		const parent = document.createElement('div');
		parent.style.width = '300px';
		document.body.appendChild(parent);
		const el = document.createElement('div');
		el.style.height = '20px';
		parent.appendChild(el);
		expect(fly(el, { width: '50%' }).css!(0, 1)).toContain('width: 150px');
		parent.remove();
	});

	it('restores the inline width after resolving a CSS-length start', () => {
		const el = mount((n) => (n.style.width = '180px'));
		fly(el, { width: '4rem' });
		// The temporary override used to resolve the start must be cleaned up.
		expect(el.style.width).toBe('180px');
	});
});

describe('scale() with width/height', () => {
	it('combines the scale pop with a width tween', () => {
		const el = mount(() => {});
		const at0 = scale(el, { start: 0.9, width: 0 }).css!(0, 1);
		expect(at0).toContain('transform: scale(0.9)');
		expect(at0).toContain('width: 0px');
	});
});
