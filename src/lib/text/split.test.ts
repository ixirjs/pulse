/**
 * Pure text tokenizers. Runs in the `server` (node) project — no DOM.
 */

import { describe, expect, it } from 'vitest';
import { tokenizeWords, tokenizeChars } from './split';

describe('tokenizeWords()', () => {
	it('splits into words and whitespace tokens', () => {
		expect(tokenizeWords('hi there')).toEqual([
			{ value: 'hi', isWhitespace: false },
			{ value: ' ', isWhitespace: true },
			{ value: 'there', isWhitespace: false }
		]);
	});

	it('round-trips to the original string', () => {
		const text = '  the  quick\tbrown\nfox ';
		expect(
			tokenizeWords(text)
				.map((t) => t.value)
				.join('')
		).toBe(text);
	});

	it('returns no tokens for an empty string', () => {
		expect(tokenizeWords('')).toEqual([]);
	});

	it('flags a whitespace-only string as a single whitespace token', () => {
		expect(tokenizeWords('   ')).toEqual([{ value: '   ', isWhitespace: true }]);
	});
});

describe('tokenizeChars()', () => {
	it('splits into individual characters', () => {
		expect(tokenizeChars('abc')).toEqual(['a', 'b', 'c']);
	});

	it('keeps surrogate-pair emoji intact', () => {
		expect(tokenizeChars('a🎉b')).toEqual(['a', '🎉', 'b']);
	});

	it('preserves whitespace characters', () => {
		expect(tokenizeChars('a b')).toEqual(['a', ' ', 'b']);
	});
});
