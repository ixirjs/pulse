/**
 * Tests for buildKeyframes() with explicit from/to values.
 * When `from` is provided explicitly (not null, not an auto keyword),
 * no DOM access is needed — runs in the `server` vitest project.
 */

import { describe, expect, it } from 'vitest';
import { buildKeyframes } from './keyframes';

// A minimal fake element — never accessed when from is explicit and
// no auto keywords are used (isBrowser() is false in node anyway).
const el = {} as HTMLElement;

describe('buildKeyframes() — explicit from/to, no DOM', () => {
	it('returns an empty groups array for empty props', () => {
		const { groups } = buildKeyframes(el, {}, {});
		expect(groups).toHaveLength(0);
	});

	it('creates one group for a single prop', () => {
		const { groups } = buildKeyframes(el, { opacity: ['0', '1'] }, {});
		expect(groups).toHaveLength(1);
	});

	it('keyframe has correct from/to for opacity', () => {
		const { groups } = buildKeyframes(el, { opacity: ['0', '1'] }, {});
		expect(groups[0]!.keyframes['opacity']).toEqual(['0', '1']);
	});

	it('formats numeric to values with the correct unit', () => {
		// x has unit "px"
		const { groups } = buildKeyframes(el, { x: ['0px', 100] }, {});
		const xFrames = groups[0]!.keyframes['--motion-x'];
		expect(xFrames![1]).toBe('100px');
	});

	it('coalesces props with the same timing into one group', () => {
		const { groups } = buildKeyframes(
			el,
			{ opacity: ['0', '1'], x: ['0px', '100px'] },
			{ duration: 300 }
		);
		// Both props share the same timing → one group
		expect(groups).toHaveLength(1);
		expect(groups[0]!.keyframes).toHaveProperty('opacity');
		expect(groups[0]!.keyframes).toHaveProperty('--motion-x');
	});

	it('creates separate groups for props with different durations', () => {
		const { groups } = buildKeyframes(
			el,
			{
				opacity: { from: '0', to: '1', duration: 300 },
				x: { from: '0px', to: '100px', duration: 600 }
			},
			{}
		);
		expect(groups).toHaveLength(2);
	});

	it('needsTransform is true when a transform prop is present', () => {
		const { needsTransform } = buildKeyframes(el, { x: ['0px', '100px'] }, {});
		expect(needsTransform).toBe(true);
	});

	it('needsTransform is false for non-transform props', () => {
		const { needsTransform } = buildKeyframes(el, { opacity: ['0', '1'] }, {});
		expect(needsTransform).toBe(false);
	});

	it('transformBits is non-zero when transform props are animated', () => {
		const { transformBits } = buildKeyframes(el, { x: ['0px', '100px'] }, {});
		expect(transformBits).toBeGreaterThan(0);
	});

	it('finalStyles records the target value for each prop', () => {
		const { finalStyles } = buildKeyframes(el, { opacity: ['0', '1'] }, {});
		const entry = finalStyles.find((s) => s.css === 'opacity');
		expect(entry).toBeDefined();
		expect(entry!.value).toBe('1');
	});

	it('restorations is empty when no auto keywords are used', () => {
		const { restorations } = buildKeyframes(el, { opacity: ['0', '1'], x: ['0px', '100px'] }, {});
		expect(restorations).toHaveLength(0);
	});

	it('timing inherits duration from defaults', () => {
		const { groups } = buildKeyframes(el, { opacity: ['0', '1'] }, { duration: 500 });
		expect(groups[0]!.timing.duration).toBe(500);
	});

	it('prop-level duration overrides defaults', () => {
		const { groups } = buildKeyframes(
			el,
			{ opacity: { from: '0', to: '1', duration: 200 } },
			{ duration: 500 }
		);
		expect(groups[0]!.timing.duration).toBe(200);
	});
});

describe('buildKeyframes() — multi-stop sequences', () => {
	it('expands a 3+ value array into N keyframe stops', () => {
		const { groups } = buildKeyframes(el, { x: [0, 100, 50, 120] }, {});
		expect(groups[0]!.keyframes['--motion-x']).toEqual(['0px', '100px', '50px', '120px']);
	});

	it('keeps a 2-value array as a from/to pair', () => {
		const { groups } = buildKeyframes(el, { x: [0, 100] }, {});
		expect(groups[0]!.keyframes['--motion-x']).toEqual(['0px', '100px']);
	});

	it('uses the last stop as the final style', () => {
		const { finalStyles } = buildKeyframes(el, { x: [0, 100, 50] }, {});
		expect(finalStyles).toContainEqual({ css: '--motion-x', value: '50px' });
	});

	it('accepts a config with `values`', () => {
		const { groups } = buildKeyframes(el, { opacity: { values: [0, 1, 0.5] } }, {});
		expect(groups[0]!.keyframes['opacity']).toEqual(['0', '1', '0.5']);
	});

	it('attaches a matching offset and isolates the group', () => {
		const { groups } = buildKeyframes(
			el,
			{
				opacity: [0, 1], // even-spaced, mergeable
				x: { values: [0, 100, 50], offset: [0, 0.3, 1] } // offset → private group
			},
			{}
		);
		const offsetGroup = groups.find((g) => g.offset);
		expect(offsetGroup?.offset).toEqual([0, 0.3, 1]);
		// The offset group holds only the x prop — opacity is in a separate group.
		expect(Object.keys(offsetGroup!.keyframes)).toEqual(['--motion-x']);
		expect(groups).toHaveLength(2);
	});

	it("ignores an offset whose length doesn't match the stops", () => {
		const { groups } = buildKeyframes(el, { x: { values: [0, 100, 50], offset: [0, 1] } }, {});
		expect(groups[0]!.offset).toBeUndefined();
	});
});

describe('buildKeyframes() — compositability grouping', () => {
	it('keeps a layout-animating prop out of the compositable group', () => {
		const { groups } = buildKeyframes(
			el,
			{ opacity: ['0', '1'], width: ['0px', '100px'] },
			{ duration: 300 }
		);

		// One effect per class: a `width` in the same effect would pin the
		// opacity to the main thread alongside it.
		expect(groups).toHaveLength(2);
		expect(groups.find((group) => group.compositable)!.keyframes).toEqual({
			opacity: ['0', '1']
		});
		expect(groups.find((group) => !group.compositable)!.keyframes).toEqual({
			width: ['0px', '100px']
		});
	});

	it('still merges props that are compositable together', () => {
		const { groups } = buildKeyframes(
			el,
			{ opacity: ['0', '1'], x: ['0px', '100px'], filter: ['none', 'blur(2px)'] },
			{ duration: 300 }
		);

		expect(groups).toHaveLength(1);
	});

	it('groups several layout props together rather than one effect each', () => {
		const { groups } = buildKeyframes(
			el,
			{ width: ['0px', '10px'], height: ['0px', '10px'] },
			{ duration: 300 }
		);

		expect(groups).toHaveLength(1);
	});
});
