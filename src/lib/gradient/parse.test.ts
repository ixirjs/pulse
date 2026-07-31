/**
 * Pure gradient parsing/interpolation. Runs in the `server` (node) project.
 */

import { describe, expect, it } from 'vitest';
import {
	formatInterpolatedLinearGradient,
	formatLinearGradient,
	lerpRGBA,
	parseLinearGradient,
	parseRGBA,
	resolvePositions
} from './parse';

describe('parseRGBA()', () => {
	it('parses 6- and 3-digit hex', () => {
		expect(parseRGBA('#ff0000')).toEqual([255, 0, 0, 1]);
		expect(parseRGBA('#f00')).toEqual([255, 0, 0, 1]);
	});

	it('parses 8-digit hex alpha', () => {
		expect(parseRGBA('#ff000080')).toEqual([255, 0, 0, 128 / 255]);
	});

	it('parses rgb() and rgba()', () => {
		expect(parseRGBA('rgb(0, 128, 255)')).toEqual([0, 128, 255, 1]);
		expect(parseRGBA('rgba(0, 128, 255, 0.5)')).toEqual([0, 128, 255, 0.5]);
	});
});

describe('lerpRGBA()', () => {
	it('interpolates each channel including alpha', () => {
		expect(lerpRGBA([0, 0, 0, 0], [255, 255, 255, 1], 0.5)).toEqual([128, 128, 128, 0.5]);
	});
});

describe('stop splitting', () => {
	it('ignores commas nested in parentheses', () => {
		// A functional color contains its own commas — splitting on them naively
		// would report four stops instead of two.
		const g = parseLinearGradient(
			'linear-gradient(90deg, rgb(1, 2, 3) 0%, rgba(4, 5, 6, 0.5) 100%)'
		);
		expect(g.stops).toEqual([
			{ color: 'rgb(1, 2, 3)', pos: 0 },
			{ color: 'rgba(4, 5, 6, 0.5)', pos: 100 }
		]);
	});
});

describe('parseLinearGradient()', () => {
	it('reads an explicit angle and stop positions', () => {
		const g = parseLinearGradient('linear-gradient(90deg, #f00 0%, #00f 100%)');
		expect(g.angle).toBe(90);
		expect(g.stops).toEqual([
			{ color: '#f00', pos: 0 },
			{ color: '#00f', pos: 100 }
		]);
	});

	it('defaults to 180deg and null positions', () => {
		const g = parseLinearGradient('linear-gradient(red, blue)');
		expect(g.angle).toBe(180);
		expect(g.stops.map((s) => s.pos)).toEqual([null, null]);
	});

	it('resolves keyword directions', () => {
		expect(parseLinearGradient('linear-gradient(to right, red, blue)').angle).toBe(90);
	});
});

describe('resolvePositions()', () => {
	it('distributes null positions evenly', () => {
		expect(
			resolvePositions([
				{ color: 'a', pos: null },
				{ color: 'b', pos: null }
			])
		).toEqual([0, 100]);
	});
});

describe('formatLinearGradient()', () => {
	it('round-trips to a valid gradient string', () => {
		const css = formatLinearGradient(90, [
			{ rgba: [255, 0, 0, 1], pos: 0 },
			{ rgba: [0, 0, 255, 1], pos: 100 }
		]);
		expect(css).toBe('linear-gradient(90deg, rgba(255, 0, 0, 1) 0%, rgba(0, 0, 255, 1) 100%)');
	});
});

describe('formatInterpolatedLinearGradient()', () => {
	it('matches the existing formatter’s interpolated output without stop objects', () => {
		const from = [[0, 0, 0, 0] as const, [255, 0, 0, 1] as const];
		const to = [[255, 255, 255, 1] as const, [0, 0, 255, 0.5] as const];
		expect(formatInterpolatedLinearGradient(0, 90, from, to, [0, 20], [10, 100], 0.5)).toBe(
			formatLinearGradient(45, [
				{ rgba: lerpRGBA(from[0], to[0], 0.5), pos: 5 },
				{ rgba: lerpRGBA(from[1], to[1], 0.5), pos: 60 }
			])
		);
	});
});
