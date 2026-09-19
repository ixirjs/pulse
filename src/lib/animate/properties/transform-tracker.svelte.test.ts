import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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
