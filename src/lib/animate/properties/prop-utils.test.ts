/**
 * Tests for property name resolution and CSS value helpers.
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it } from 'vitest';
import { formatValue, resolveProp, toKeyframeKey } from './prop-utils';
import type { PropDef } from './properties';

const def = (unit: string): PropDef => ({
	css: 'opacity',
	unit,
	initial: '0'
});

// ---------------------------------------------------------------------------
// formatValue()
// ---------------------------------------------------------------------------

describe('formatValue()', () => {
	it('appends unit to a number', () => {
		expect(formatValue(42, def('px'))).toBe('42px');
	});

	it("appends empty unit when unit is ''", () => {
		expect(formatValue(1.5, def(''))).toBe('1.5');
	});

	it('returns string values unchanged', () => {
		expect(formatValue('50%', def('px'))).toBe('50%');
		expect(formatValue('auto', def('px'))).toBe('auto');
	});

	it('handles 0 with unit', () => {
		expect(formatValue(0, def('deg'))).toBe('0deg');
	});

	it('handles negative numbers', () => {
		expect(formatValue(-10, def('px'))).toBe('-10px');
	});

	it('handles fractional numbers', () => {
		expect(formatValue(0.75, def(''))).toBe('0.75');
	});
});

// ---------------------------------------------------------------------------
// resolveProp()
// ---------------------------------------------------------------------------

describe('resolveProp()', () => {
	it("returns known prop definition for 'x'", () => {
		const d = resolveProp('x');
		expect(d.css).toBe('--motion-x');
		expect(d.transform).toBe(true);
	});

	it("returns known prop definition for 'opacity'", () => {
		const d = resolveProp('opacity');
		expect(d.css).toBe('opacity');
		expect(d.unit).toBe('');
		expect(d.transform).toBeFalsy();
	});

	it("returns known prop definition for 'scale'", () => {
		const d = resolveProp('scale');
		expect(d.css).toBe('--motion-scale');
		expect(d.transform).toBe(true);
	});

	it('converts camelCase unknown key to kebab-case CSS', () => {
		const d = resolveProp('someCustomProp');
		expect(d.css).toBe('some-custom-prop');
	});

	it('handles already kebab-cased unknown key', () => {
		const d = resolveProp('background-color');
		expect(d.css).toBe('background-color');
	});

	it('caches unknown prop definitions by reference', () => {
		const a = resolveProp('fooBarBaz');
		const b = resolveProp('fooBarBaz');
		expect(a).toBe(b);
	});

	it('returns a definition with empty unit and initial for unknown props', () => {
		const d = resolveProp('xyzUnknown');
		expect(d.unit).toBe('');
		expect(d.initial).toBe('');
	});

	it('known props always return the same reference', () => {
		expect(resolveProp('opacity')).toBe(resolveProp('opacity'));
	});
});

// ---------------------------------------------------------------------------
// toKeyframeKey() — WAAPI keyframe objects need camelCased IDL names; Chrome
// silently ignores hyphenated multi-word properties.
// ---------------------------------------------------------------------------

describe('toKeyframeKey()', () => {
	it('camelCases multi-word CSS properties', () => {
		expect(toKeyframeKey('offset-distance')).toBe('offsetDistance');
		expect(toKeyframeKey('stroke-dashoffset')).toBe('strokeDashoffset');
		expect(toKeyframeKey('background-color')).toBe('backgroundColor');
		expect(toKeyframeKey('border-top-left-radius')).toBe('borderTopLeftRadius');
	});

	it('leaves single-word properties unchanged', () => {
		expect(toKeyframeKey('opacity')).toBe('opacity');
		expect(toKeyframeKey('color')).toBe('color');
	});

	it('leaves custom properties verbatim (no camelCase IDL form)', () => {
		expect(toKeyframeKey('--motion-x')).toBe('--motion-x');
		expect(toKeyframeKey('--flip-scale-y')).toBe('--flip-scale-y');
	});
});
