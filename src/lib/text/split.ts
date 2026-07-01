/**
 * SplitText — break an element's text into per-character / per-word / per-line
 * wrapper `<span>`s so the pieces can be animated individually (e.g. with
 * `stagger()`). The GSAP-SplitText analog.
 *
 * The tokenizers (`tokenizeWords`, `tokenizeChars`) are pure and DOM-free so
 * they are unit-testable in a node environment; `splitText()` is the DOM
 * wrapper that builds the spans and is browser-only.
 */

import { isBrowser } from '$lib/shared/browser';

/** Which granularity / granularities to split into. Default: `'chars'`. */
export type SplitType = 'chars' | 'words' | 'lines';

export interface SplitTextOptions {
	/** Granularity to split into. A single type or an array of types. Default `'chars'`. */
	type?: SplitType | SplitType[];
	/** Class applied to every character wrapper span. */
	charClass?: string;
	/** Class applied to every word wrapper span. */
	wordClass?: string;
	/** Class applied to every line wrapper span. */
	lineClass?: string;
}

export interface SplitTextResult {
	/** Per-character wrapper spans (empty unless `'chars'` was requested). */
	chars: HTMLElement[];
	/** Per-word wrapper spans (empty unless `'words'` was requested). */
	words: HTMLElement[];
	/** Per-line wrapper spans (empty unless `'lines'` was requested). */
	lines: HTMLElement[];
	/** Restore the element's original `innerHTML`. */
	revert: () => void;
}

const WHITESPACE = /(\s+)/;

/**
 * Split text into words, preserving the whitespace runs between them as their
 * own tokens. Pure (no DOM).
 *
 * The returned tokens, joined, reproduce the input exactly. Each token is
 * flagged so callers can decide whether to wrap it (words) or emit it as-is
 * (whitespace).
 *
 * @param text - The raw text to tokenize.
 * @returns Ordered tokens, each `{ value, isWhitespace }`.
 */
export const tokenizeWords = (text: string): { value: string; isWhitespace: boolean }[] =>
	text
		.split(WHITESPACE)
		.filter((part) => part.length > 0)
		.map((value) => ({ value, isWhitespace: WHITESPACE.test(value) }));

/**
 * Split text into individual characters, using the Unicode-aware iterator so
 * surrogate pairs (emoji, etc.) stay intact. Pure (no DOM).
 *
 * @param text - The raw text to tokenize.
 * @returns The characters in order. Whitespace characters are preserved.
 */
export const tokenizeChars = (text: string): string[] => Array.from(text);

/** Builds an inline-block span carrying an optional class. */
const makeSpan = (className?: string): HTMLElement => {
	const span = document.createElement('span');
	span.style.display = 'inline-block';
	if (className) span.className = className;
	return span;
};

const normalizeTypes = (type: SplitTextOptions['type']): Set<SplitType> => {
	const list = type === undefined ? ['chars'] : Array.isArray(type) ? type : [type];
	return new Set(list as SplitType[]);
};

/** A no-op SSR / fallback result. */
const emptyResult = (): SplitTextResult => ({
	chars: [],
	words: [],
	lines: [],
	revert: () => {}
});

/**
 * Split an element's text content into wrapper `<span>`s for animation.
 *
 * Words are always wrapped internally (so characters never break mid-word at a
 * line end); requested arrays are returned for the caller to animate, and
 * `revert()` restores the original markup. SSR-safe: outside a browser it
 * returns empty arrays and a no-op `revert`.
 *
 * @param element - The element whose text will be split. Its text is read from
 *   `textContent`, so nested markup is flattened.
 * @param options - Granularity (`type`) and per-piece class hooks.
 * @returns The created spans grouped by kind plus a `revert()`.
 */
export const splitText = (
	element: HTMLElement,
	options: SplitTextOptions = {}
): SplitTextResult => {
	if (!isBrowser()) return emptyResult();

	const types = normalizeTypes(options.type);
	const wantChars = types.has('chars');
	const wantWords = types.has('words');
	const wantLines = types.has('lines');

	const originalHTML = element.innerHTML;
	const text = element.textContent ?? '';

	const chars: HTMLElement[] = [];
	const words: HTMLElement[] = [];
	const lines: HTMLElement[] = [];

	// Word spans are always built so chars stay grouped per word (no mid-word
	// wrapping at line ends). They double as the measurement units for lines.
	const wordSpans: HTMLElement[] = [];

	const fragment = document.createDocumentFragment();

	for (const token of tokenizeWords(text)) {
		if (token.isWhitespace) {
			// Preserve inter-word whitespace as a real text node so spacing and
			// wrapping behave normally.
			fragment.appendChild(document.createTextNode(token.value));
			continue;
		}

		const wordSpan = makeSpan(wantWords ? options.wordClass : undefined);
		// Keep the whole word on one line so it doesn't fracture across the wrap.
		wordSpan.style.whiteSpace = 'nowrap';

		if (wantChars) {
			for (const char of tokenizeChars(token.value)) {
				const charSpan = makeSpan(options.charClass);
				charSpan.textContent = char;
				wordSpan.appendChild(charSpan);
				chars.push(charSpan);
			}
		} else {
			wordSpan.textContent = token.value;
		}

		wordSpans.push(wordSpan);
		if (wantWords) words.push(wordSpan);
		fragment.appendChild(wordSpan);
	}

	element.replaceChildren(fragment);

	if (wantLines) {
		groupIntoLines(element, wordSpans, options.lineClass).forEach((line) => lines.push(line));
	}

	const revert = () => {
		element.innerHTML = originalHTML;
	};

	return { chars, words, lines, revert };
};

/**
 * Group already-laid-out word spans into per-line wrapper spans by measuring
 * `offsetTop` — words sharing an `offsetTop` are on the same visual line. Each
 * line group is moved into a new wrapper span inserted in place.
 *
 * @param element - The container holding the word spans.
 * @param wordSpans - The word spans, in document order.
 * @param lineClass - Optional class for each line wrapper.
 * @returns The created line wrapper spans.
 */
const groupIntoLines = (
	element: HTMLElement,
	wordSpans: HTMLElement[],
	lineClass?: string
): HTMLElement[] => {
	const lines: HTMLElement[] = [];
	if (wordSpans.length === 0) return lines;

	// Bucket words by their measured vertical offset (one bucket per line).
	const buckets: { top: number; spans: HTMLElement[] }[] = [];
	for (const span of wordSpans) {
		const top = span.offsetTop;
		const bucket = buckets.at(-1);
		if (bucket && bucket.top === top) {
			bucket.spans.push(span);
		} else {
			buckets.push({ top, spans: [span] });
		}
	}

	for (const bucket of buckets) {
		const lineSpan = makeSpan(lineClass);
		const first = bucket.spans[0];
		// Insert the line wrapper where the first word currently sits, then move
		// that word and every following whitespace/word node up to the next line.
		element.insertBefore(lineSpan, first);

		const last = bucket.spans[bucket.spans.length - 1];
		let node: ChildNode | null = first;
		while (node) {
			const next: ChildNode | null = node.nextSibling;
			lineSpan.appendChild(node);
			if (node === last) break;
			node = next;
		}

		lines.push(lineSpan);
	}

	return lines;
};
