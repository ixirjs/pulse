/**
 * splitText() against real DOM + layout. Runs in the `client` project.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { splitText } from './split';

let host: HTMLElement | null = null;

const mount = (html: string): HTMLElement => {
	host = document.createElement('p');
	host.innerHTML = html;
	document.body.appendChild(host);
	return host;
};

afterEach(() => {
	host?.remove();
	host = null;
});

describe('splitText()', () => {
	it('wraps each character by default and groups them in word spans', () => {
		const el = mount('hi there');
		const result = splitText(el);

		// "hi" (2) + "there" (5) = 7 chars; whitespace is not a char span.
		expect(result.chars).toHaveLength(7);
		expect(result.chars.every((c) => c.style.display === 'inline-block')).toBe(true);
		// Words are wrapped internally even when only chars were requested.
		expect(el.querySelectorAll('span > span')).toHaveLength(7);
		expect(result.words).toHaveLength(0);
		expect(result.lines).toHaveLength(0);
	});

	it('preserves inter-word whitespace in the text content', () => {
		const el = mount('a b c');
		splitText(el);
		expect(el.textContent).toBe('a b c');
	});

	it("returns word spans when 'words' is requested", () => {
		const el = mount('one two three');
		const result = splitText(el, { type: 'words' });
		expect(result.words).toHaveLength(3);
		expect(result.chars).toHaveLength(0);
		expect(result.words[0].textContent).toBe('one');
	});

	it('supports requesting multiple types at once', () => {
		const el = mount('one two');
		const result = splitText(el, { type: ['chars', 'words'] });
		expect(result.words).toHaveLength(2);
		expect(result.chars).toHaveLength(6);
	});

	it('applies class hooks', () => {
		const el = mount('hey');
		const result = splitText(el, { type: ['chars', 'words'], charClass: 'c', wordClass: 'w' });
		expect(result.words[0].classList.contains('w')).toBe(true);
		expect(result.chars[0].classList.contains('c')).toBe(true);
	});

	it('groups words into line spans', () => {
		const el = mount('alpha beta gamma');
		const result = splitText(el, { type: 'lines' });
		// At least one line is produced and contains the words.
		expect(result.lines.length).toBeGreaterThanOrEqual(1);
		expect(result.lines[0].querySelectorAll('span').length).toBeGreaterThan(0);
	});

	it('revert() restores the original innerHTML', () => {
		const el = mount('hello world');
		const before = el.innerHTML;
		const result = splitText(el, { type: ['chars', 'words', 'lines'] });
		expect(el.innerHTML).not.toBe(before);
		result.revert();
		expect(el.innerHTML).toBe(before);
	});
});
