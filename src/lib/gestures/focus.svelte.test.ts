/**
 * focusable() attachment in a real browser. Runs in the `client` project.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusable } from './focus';

let node: HTMLElement | null = null;

const mount = (): HTMLElement => {
	const el = document.createElement('div');
	el.innerHTML = '<button id="a">A</button><button id="b">B</button>';
	document.body.appendChild(el);
	node = el;
	return el;
};

afterEach(() => {
	node?.remove();
	node = null;
});

describe('focusable()', () => {
	it('fires start when focus enters and end when it leaves', () => {
		const el = mount();
		const onFocusStart = vi.fn();
		const onFocusEnd = vi.fn();
		const cleanup = focusable({ onFocusStart, onFocusEnd })(el);

		el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
		expect(onFocusStart).toHaveBeenCalledOnce();

		el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
		expect(onFocusEnd).toHaveBeenCalledOnce();
		cleanup?.();
	});

	it('stays focused while focus moves between children (focus-within)', () => {
		const el = mount();
		const a = el.querySelector('#a')!;
		const b = el.querySelector('#b')!;
		const onFocusStart = vi.fn();
		const onFocusEnd = vi.fn();
		const cleanup = focusable({ onFocusStart, onFocusEnd })(el);

		a.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
		// Focus shifts to a sibling still inside the element — no end, no re-start.
		a.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: b }));
		b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

		expect(onFocusStart).toHaveBeenCalledOnce();
		expect(onFocusEnd).not.toHaveBeenCalled();
		cleanup?.();
	});
});
