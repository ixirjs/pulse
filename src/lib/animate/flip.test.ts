/**
 * Tests for the FLIP animate-layer helpers.
 * `captureRect`, `flipFromRect`, and `flipToRect` all delegate to
 * `measureWithoutAncestorTransforms` which uses DOM globals (HTMLElement,
 * getBoundingClientRect). Those paths require the `client` browser project.
 *
 * This file covers the module's exports and the FlipRect type shape.
 * Runs in the `server` vitest project.
 */

import { describe, expect, it } from 'vitest';
import * as flipModule from './flip';
import { buildFlipProps, resolveFlipDelta } from './flip';

describe('animate/flip module exports', () => {
	it('exports captureRect as a function', () => {
		expect(typeof flipModule.captureRect).toBe('function');
	});

	it('exports flipFromRect as a function', () => {
		expect(typeof flipModule.flipFromRect).toBe('function');
	});

	it('exports flipToRect as a function', () => {
		expect(typeof flipModule.flipToRect).toBe('function');
	});

	it('exports captureVisualRect as a function', () => {
		expect(typeof flipModule.captureVisualRect).toBe('function');
	});
});

// ---------------------------------------------------------------------------
// FLIP direction — the inverse / forward contract shared by both FLIP layers.
// These drive `resolveFlipDelta` (the same helper `flipToRect`/`flipFromRect`
// and the animator use) so they guard the forward swap directly, not just the
// keyframe pairing. The visual `animate()` path only runs in a browser.
// ---------------------------------------------------------------------------

const rect = (x: number, w: number) => ({ x, y: 0, width: w, height: 50 });

describe('resolveFlipDelta() direction', () => {
	// Element physically at {x:0,w:100}; we want it to look like {x:200,w:50}.
	const current = rect(0, 100);
	const target = rect(200, 50);

	it('inverse FLIP returns the (from − to) transform placing the element at `from`', () => {
		// flipFromRect: from = old rect, to = current DOM position; no swap.
		const delta = resolveFlipDelta(target, current, false);
		expect(delta.dx).toBe(200); // target.x − current.x
		expect(delta.sx).toBe(0.5); // target.w / current.w
		const props = buildFlipProps(delta, false);
		expect(props.flipX).toEqual(['200px', '0px']); // starts offset, ends at rest
	});

	it('forward FLIP swaps the pair so the element is driven toward the target', () => {
		// flipToRect: from = current, to = target, forward = true → swap to (to − from).
		const delta = resolveFlipDelta(current, target, true);
		// Swapped: dx = target.x − current.x = +200 (NOT current.x − target.x = −200),
		// sx = target.w / current.w = 0.5 (NOT 2). The swap is what makes the element
		// move toward the target rather than the mirror-opposite direction.
		expect(delta.dx).toBe(200);
		expect(delta.sx).toBe(0.5);
		const props = buildFlipProps(delta, true);
		expect(props.flipX).toEqual(['0px', '200px']); // starts at rest, ends at target
	});
});
