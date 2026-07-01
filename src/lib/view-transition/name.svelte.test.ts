/**
 * `viewTransitionName()` attachment in a real browser. Runs in the `client`
 * project. Plain attachments are exercised by invoking `attachment(el)`
 * directly; the reactive thunk path runs inside an `$effect.root`.
 */

import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { viewTransitionName } from './name.svelte';

const nameOf = (el: HTMLElement): string => el.style.getPropertyValue('view-transition-name');

let roots: Array<() => void> = [];

afterEach(() => {
	for (const dispose of roots) dispose();
	roots = [];
});

describe('viewTransitionName()', () => {
	it('sets a static name and removes it on teardown', () => {
		const el = document.createElement('div');
		const teardown = viewTransitionName('hero')(el);
		expect(nameOf(el)).toBe('hero');
		if (typeof teardown === 'function') teardown();
		expect(nameOf(el)).toBe('');
	});

	it('tracks a reactive thunk and removes the name on teardown', () => {
		const el = document.createElement('div');
		let id = $state('a');
		let teardown: (() => void) | undefined;

		const dispose = $effect.root(() => {
			teardown = viewTransitionName(() => `item-${id}`)(el) as (() => void) | undefined;
		});
		roots.push(dispose);

		flushSync();
		expect(nameOf(el)).toBe('item-a');

		id = 'b';
		flushSync();
		expect(nameOf(el)).toBe('item-b');

		if (typeof teardown === 'function') teardown();
		expect(nameOf(el)).toBe('');
	});

	it('clears the name when the thunk returns undefined', () => {
		const el = document.createElement('div');
		let active = $state(true);

		const dispose = $effect.root(() => {
			viewTransitionName(() => (active ? 'on' : undefined))(el);
		});
		roots.push(dispose);

		flushSync();
		expect(nameOf(el)).toBe('on');

		active = false;
		flushSync();
		expect(nameOf(el)).toBe('');
	});
});
