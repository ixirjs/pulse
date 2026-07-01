/**
 * `viewTransitionNavigate()` in a real browser. Runs in the `client` project.
 */

import { describe, expect, it } from 'vitest';
import { supportsViewTransitions } from './view-transition';
import { viewTransitionNavigate } from './navigation';

describe('viewTransitionNavigate()', () => {
	it('returns undefined (a plain navigation) when the API is unavailable', () => {
		const doc = document as unknown as {
			startViewTransition?: Document['startViewTransition'];
		};
		const original = doc.startViewTransition;
		doc.startViewTransition = undefined;
		try {
			const result = viewTransitionNavigate({ complete: Promise.resolve() });
			expect(result).toBeUndefined();
		} finally {
			doc.startViewTransition = original;
		}
	});

	it('gates SvelteKit on the before-snapshot, then lets the page render', async () => {
		if (!supportsViewTransitions()) {
			expect(supportsViewTransitions()).toBe(false);
			return;
		}
		let completeResolve!: () => void;
		const complete = new Promise<void>((resolve) => (completeResolve = resolve));

		const gate = viewTransitionNavigate({ complete }, { duration: 60 });
		expect(gate).toBeInstanceOf(Promise);

		// The gate resolves once the transition has snapshotted the old state and
		// invoked the update callback — that's when SvelteKit may swap the DOM.
		await gate;

		// Release the "new page rendered" signal so the transition can settle.
		completeResolve();
	});
});
