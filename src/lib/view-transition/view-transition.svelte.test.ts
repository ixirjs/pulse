/**
 * `viewTransition()` in a real browser (Chromium has the View Transitions
 * API). Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { supportsViewTransitions, viewTransition } from './view-transition';

let mounted: HTMLElement[] = [];

const mount = (): HTMLElement => {
	const el = document.createElement('div');
	el.style.width = '40px';
	el.style.height = '40px';
	document.body.appendChild(el);
	mounted.push(el);
	return el;
};

/** Read each pseudo-animation's resolved easing string. */
const easingsOf = (animations: readonly Animation[]): string[] =>
	animations.map((a) => ((a.effect as KeyframeEffect | null)?.getTiming().easing as string) ?? '');

afterEach(() => {
	for (const el of mounted) el.remove();
	mounted = [];
});

describe('viewTransition()', () => {
	it('reports support in this environment', () => {
		// Chromium supports it; the assertion documents the environment either way.
		expect(typeof supportsViewTransitions()).toBe('boolean');
	});

	it('runs the update callback and resolves finished', async () => {
		const el = mount();
		let ran = false;
		const ctrl = viewTransition(
			() => {
				ran = true;
				el.style.width = '80px';
			},
			{ duration: 60 }
		);
		await ctrl.finished;
		expect(ran).toBe(true);
		expect(el.style.width).toBe('80px');
	});

	it('re-eases the morph with the spring curve', async () => {
		if (!supportsViewTransitions()) {
			expect(supportsViewTransitions()).toBe(false);
			return;
		}
		const el = mount();
		el.style.setProperty('view-transition-name', 'vt-box');

		let captured: string[] = [];
		const ctrl = viewTransition(
			() => {
				el.style.width = '120px';
			},
			{
				spring: true,
				duration: 80,
				names: ['vt-box'],
				onReady: () => (captured = easingsOf(ctrl.animations))
			}
		);
		await ctrl.finished;

		expect(captured.length).toBeGreaterThan(0);
		expect(captured.every((e) => e.startsWith('linear('))).toBe(true);
	});

	it('falls back to an un-animated update when the API is unavailable', async () => {
		const doc = document as unknown as {
			startViewTransition?: Document['startViewTransition'];
		};
		const original = doc.startViewTransition;
		doc.startViewTransition = undefined;
		try {
			expect(supportsViewTransitions()).toBe(false);
			let ran = false;
			const ctrl = viewTransition(() => {
				ran = true;
			});
			await ctrl.finished;
			expect(ran).toBe(true);
			expect(ctrl.animations).toHaveLength(0);
		} finally {
			doc.startViewTransition = original;
		}
	});
});
