import { afterEach, describe, expect, it } from 'vitest';
import { createDynamicAttrs } from './dynamic';

let mounted: Element[] = [];

const mountBox = (className = ''): HTMLDivElement => {
	const element = document.createElement('div');
	element.className = className;
	document.body.appendChild(element);
	mounted.push(element);
	return element;
};

afterEach(() => {
	for (const element of mounted) element.remove();
	mounted = [];
});

describe('createDynamicAttrs()', () => {
	it('flattens ClassValue shapes and leaves markup classes alone', () => {
		const element = mountBox('from-markup');
		const attrs = createDynamicAttrs(element);

		expect(attrs.write(['a', { b: true, c: false }], undefined)).toBe(true);
		expect([...element.classList].sort()).toEqual(['a', 'b', 'from-markup']);

		expect(attrs.write(['b'], undefined)).toBe(true);
		expect([...element.classList].sort()).toEqual(['b', 'from-markup']);
	});

	it('diffs style declarations without disturbing the animator’s properties', () => {
		const element = mountBox();
		element.style.setProperty('--motion-x', '5px');
		const attrs = createDynamicAttrs(element);

		expect(attrs.write(undefined, 'color: red; --x: 1px')).toBe(true);
		expect(element.style.getPropertyValue('color')).toBe('red');
		expect(element.style.getPropertyValue('--x')).toBe('1px');

		expect(attrs.write(undefined, 'color: blue')).toBe(true);
		expect(element.style.getPropertyValue('color')).toBe('blue');
		expect(element.style.getPropertyValue('--x')).toBe('');
		expect(element.style.getPropertyValue('--motion-x')).toBe('5px');
	});

	it('preserves !important priority', () => {
		const element = mountBox();
		const attrs = createDynamicAttrs(element);

		attrs.write(undefined, 'color: red !important');
		expect(element.style.getPropertyPriority('color')).toBe('important');
	});

	it('reports no change when nothing moved, so callers can skip the reflow', () => {
		const element = mountBox();
		const attrs = createDynamicAttrs(element);

		expect(attrs.write('a', 'color: red')).toBe(true);
		expect(attrs.write('a', 'color: red')).toBe(false);
	});

	it('resets only what it applied', () => {
		const element = mountBox('from-markup');
		element.style.setProperty('--motion-x', '5px');
		const attrs = createDynamicAttrs(element);

		attrs.write('a', 'color: red');
		attrs.reset();

		expect([...element.classList]).toEqual(['from-markup']);
		expect(element.style.getPropertyValue('color')).toBe('');
		expect(element.style.getPropertyValue('--motion-x')).toBe('5px');
	});
});
