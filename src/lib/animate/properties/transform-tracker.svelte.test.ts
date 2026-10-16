import { afterEach, describe, expect, it, vi } from 'vitest';
import { animate } from '../core/animate';
import {
	batchMeasurements,
	deregisterTransformAnimation,
	measureWithoutAncestorTransforms,
	registerFoldedTransforms,
	registerTransformAnimation,
	VAR_BIT
} from './transform-tracker';

let mounted: HTMLElement[] = [];

afterEach(() => {
	for (const element of mounted) element.remove();
	mounted = [];
	vi.restoreAllMocks();
});

describe('measureWithoutAncestorTransforms()', () => {
	it('tracks overlapping transform animations without scanning inactive channels', () => {
		const parent = document.createElement('div');
		const child = document.createElement('div');
		parent.appendChild(child);
		document.body.appendChild(parent);
		mounted.push(parent);
		parent.style.setProperty('--motion-x', '20px');
		const observed: Array<[string, string]> = [];
		vi.spyOn(child, 'getBoundingClientRect').mockImplementation(() => {
			observed.push([
				parent.style.getPropertyValue('--motion-x'),
				parent.style.getPropertyPriority('--motion-x')
			]);
			return new DOMRect();
		});
		const x = VAR_BIT['--motion-x']!;

		registerTransformAnimation(parent, x);
		registerTransformAnimation(parent, x);
		deregisterTransformAnimation(parent, x);
		measureWithoutAncestorTransforms(child);
		expect(observed).toEqual([['0px', 'important']]);
		expect(parent.style.getPropertyValue('--motion-x')).toBe('20px');

		deregisterTransformAnimation(parent, x);
		measureWithoutAncestorTransforms(child);
		expect(observed[1]).toEqual(['20px', '']);
	});
});

describe('will-change hint', () => {
	it('is set for the first channel, held across overlap, and restored after the last', () => {
		const element = document.createElement('div');
		document.body.appendChild(element);
		mounted.push(element);
		element.style.setProperty('will-change', 'opacity');
		const x = VAR_BIT['--motion-x']!;
		const y = VAR_BIT['--motion-y']!;

		registerTransformAnimation(element, x);
		expect(element.style.getPropertyValue('will-change')).toBe('translate, scale, rotate');

		registerTransformAnimation(element, y);
		deregisterTransformAnimation(element, x);
		expect(element.style.getPropertyValue('will-change')).toBe('translate, scale, rotate');

		deregisterTransformAnimation(element, y);
		expect(element.style.getPropertyValue('will-change')).toBe('opacity');
	});
});

describe('folded transforms', () => {
	const fold = (element: HTMLElement) => {
		const animation = { effect: { setKeyframes: vi.fn() } } as unknown as Animation;
		registerFoldedTransforms(element, [
			{
				animation,
				varFrames: { '--flip-x': ['10px', '0px'] },
				targets: [['translate', 'calc(var(--flip-x, 0px)) 0px 0px']]
			}
		]);
		return animation;
	};

	it('reinstates the variable keyframes when another transform animation starts', () => {
		const element = document.createElement('div');
		document.body.appendChild(element);
		mounted.push(element);
		registerTransformAnimation(element, VAR_BIT['--flip-x']!);
		const animation = fold(element);

		registerTransformAnimation(element, VAR_BIT['--motion-x']!);

		expect((animation.effect as KeyframeEffect).setKeyframes).toHaveBeenCalledWith({
			'--flip-x': ['10px', '0px']
		});
	});

	it('measures at rest by reinstating the template the fold overrides', () => {
		const parent = document.createElement('div');
		const child = document.createElement('div');
		parent.appendChild(child);
		document.body.appendChild(parent);
		mounted.push(parent);
		parent.style.setProperty('--flip-x', '10px');
		registerTransformAnimation(parent, VAR_BIT['--flip-x']!);
		fold(parent);
		let observed: [string, string] | undefined;
		vi.spyOn(child, 'getBoundingClientRect').mockImplementation(() => {
			observed = [
				parent.style.getPropertyValue('translate'),
				parent.style.getPropertyPriority('translate')
			];
			return new DOMRect();
		});

		measureWithoutAncestorTransforms(child);

		expect(observed).toEqual(['calc(var(--flip-x, 0px)) 0px 0px', 'important']);
		expect(parent.style.getPropertyValue('translate')).toBe('');
	});
});

describe('batchMeasurements()', () => {
	const mountTree = (): { parent: HTMLElement; children: HTMLElement[] } => {
		const parent = document.createElement('div');
		parent.style.cssText = 'position:absolute;top:0;left:0;width:300px';
		const children = [0, 1, 2].map(() => {
			const c = document.createElement('div');
			c.style.height = '20px';
			return parent.appendChild(c);
		});
		document.body.appendChild(parent);
		mounted.push(parent);
		return { parent, children };
	};
	const paused = (el: HTMLElement, x: [number, number]) => {
		const ctrl = animate(el, { x }, { duration: 1000, easing: (t) => t });
		ctrl.pause();
		ctrl.seek(500);
		return ctrl;
	};

	it('suppresses a shared animating ancestor once, with identical rects', () => {
		const { parent, children } = mountTree();
		const ctrl = paused(parent, [0, 100]);
		const before = parent.getAttribute('style');
		const expected = children.map((c) => measureWithoutAncestorTransforms(c));

		const writes = vi.spyOn(parent.style, 'setProperty');
		measureWithoutAncestorTransforms(children[0]!);
		const perMeasure = writes.mock.calls.length;
		writes.mockClear();

		const rects = batchMeasurements(() => children.map((c) => measureWithoutAncestorTransforms(c)));
		expect(perMeasure).toBeGreaterThan(0);
		expect(writes.mock.calls.length).toBe(perMeasure); // once, not once per child
		expect(rects).toEqual(expected);
		expect(parent.getAttribute('style')).toBe(before);
		ctrl.cancel();
	});

	it('lifts an already-suppressed element for a visual read', () => {
		const { children } = mountTree();
		const child = children[1]!;
		const ctrl = paused(child, [0, 100]);
		const visual = measureWithoutAncestorTransforms(child, { suppressSelf: false });
		const [rest, live] = batchMeasurements(() => [
			measureWithoutAncestorTransforms(child),
			measureWithoutAncestorTransforms(child, { suppressSelf: false })
		]);
		expect(live!.x - rest!.x).toBeCloseTo(50, 0);
		expect(live).toEqual(visual);
		ctrl.cancel();
	});
});
