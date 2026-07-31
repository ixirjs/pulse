import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	deregisterTransformAnimation,
	measureWithoutAncestorTransforms,
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
