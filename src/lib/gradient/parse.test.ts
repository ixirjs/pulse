/**
 * Pure gradient parsing/interpolation. Runs in the `server` (node) project.
 */

import { describe, expect, it } from 'vitest';
import {
	formatLinearGradient,
	lerpRGBA,
	parseLinearGradient,
	parseRGBA,
	resolvePositions,
	splitTopLevel
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

describe('splitTopLevel()', () => {
	it('ignores commas nested in parentheses', () => {
		expect(splitTopLevel('a, rgb(1, 2, 3), b')).toEqual(['a', 'rgb(1, 2, 3)', 'b']);
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
