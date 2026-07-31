/**
 * Timeline position grammar — resolves user-facing position expressions into
 * absolute millisecond offsets.
 *
 * Position syntax:
 *   `undefined` / `""`      → current end of the timeline
 *   `123`                   → absolute ms
 *   `"+=200"` / `"-=100"`   → offset from current end
 *   `">"` / `">+200"`       → end of last entry ± offset
 *   `"<"` / `"<+200"`       → start of last entry ± offset
 *   `"label"` / `"label+=N"`→ named label ± offset
 */

/**
 * Where to place a timeline entry. See file header for the full grammar.
 * `undefined` means "append after the current end" — the most common case.
 */
export type TimelinePosition = number | string | undefined;

export interface Anchor {
	/** Current end of the timeline (max entry end). */
	duration: number;
	/** Start of the most recently added entry — anchor for `"<"`. */
	lastStart: number;
	/** End of the most recently added entry — anchor for `">"`. */
	lastEnd: number;
	/** Named labels. */
	labels: Map<string, number>;
}

/**
 * Parse a trailing `+=N` / `-=N` / `+N` / `-N` offset from `expr`.
 * Returns `[base, offset]`. When no offset token is present, `offset === 0`.
 */
const splitOffset = (expr: string): [string, number] => {
	const m = expr.match(/^(.*?)(?:\s*([+-]=?)\s*(\d+(?:\.\d+)?))?$/);
	if (!m || !m[2]) return [expr.trim(), 0];
	const sign = m[2].startsWith('-') ? -1 : 1;
	return [m[1]!.trim(), sign * Number(m[3])];
};

/**
 * Resolve a user-supplied position expression to an absolute ms offset
 * within the timeline, clamped to ≥ 0.
 *
 * Throws for label references that have not been declared yet.
 */
export const resolvePosition = (position: TimelinePosition, anchor: Anchor): number => {
	if (position == null) return anchor.duration;
	if (typeof position === 'number') return Math.max(0, position);

	const trimmed = position.trim();
	if (trimmed === '') return anchor.duration;

	// Pure relative: "+=N" / "-=N" — anchored to the timeline end (`duration`),
	// unlike ">"/"<" which anchor to the last entry. Reuse splitOffset so offset
	// parsing lives in one place; the base is empty for these.
	if (trimmed.startsWith('+=') || trimmed.startsWith('-=')) {
		const [, offset] = splitOffset(trimmed);
		return Math.max(0, anchor.duration + offset);
	}

	const [base, offset] = splitOffset(trimmed);

	if (base === '' || base === '>') return Math.max(0, anchor.lastEnd + offset);
	if (base === '<') return Math.max(0, anchor.lastStart + offset);

	const labelTime = anchor.labels.get(base);
	if (labelTime === undefined) {
		throw new Error(`[timeline] Unknown label or position: "${position}"`);
	}
	return Math.max(0, labelTime + offset);
};
