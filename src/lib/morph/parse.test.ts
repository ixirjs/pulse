/**
 * Pure SVG path tokenizer. Runs in the `server` (node) project.
 */

import { describe, expect, it } from 'vitest';
import { parsePath } from './parse';

describe('parsePath()', () => {
	it('parses explicit commands', () => {
		expect(parsePath('M0 0 L10 10')).toEqual([
			{ code: 'M', values: [0, 0] },
			{ code: 'L', values: [10, 10] }
		]);
	});

	it('expands implicit repeats (M → L, repeated L)', () => {
		expect(parsePath('M0 0 10 10')).toEqual([
			{ code: 'M', values: [0, 0] },
			{ code: 'L', values: [10, 10] }
		]);
		expect(parsePath('M0 0 L1 1 2 2')).toEqual([
			{ code: 'M', values: [0, 0] },
			{ code: 'L', values: [1, 1] },
			{ code: 'L', values: [2, 2] }
		]);
	});

	it('preserves relative command case', () => {
		expect(parsePath('m0 0 l5 5')).toEqual([
			{ code: 'm', values: [0, 0] },
			{ code: 'l', values: [5, 5] }
		]);
	});

	it('reads arc flags written without separators', () => {
		expect(parsePath('M0 0 A5 5 0 015 5')).toEqual([
			{ code: 'M', values: [0, 0] },
			{ code: 'A', values: [5, 5, 0, 0, 1, 5, 5] }
		]);
	});

	it('parses scientific notation and signed numbers', () => {
		expect(parsePath('M1e2 0 L-1.5-2')).toEqual([
			{ code: 'M', values: [100, 0] },
			{ code: 'L', values: [-1.5, -2] }
		]);
	});

	it('captures Z with no params', () => {
		expect(parsePath('M0 0 L1 1Z')).toEqual([
			{ code: 'M', values: [0, 0] },
			{ code: 'L', values: [1, 1] },
			{ code: 'Z', values: [] }
		]);
	});
});
