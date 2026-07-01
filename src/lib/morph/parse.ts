/**
 * SVG path `d` tokenizer. Scans a path string into a flat list of commands,
 * expanding implicit repeats (e.g. `L 1 2 3 4` → two `L`s, `M 1 2 3 4` → `M`
 * then an implicit `L`). Character-scanned rather than regex-based so arc flags
 * (`A`'s single-digit large-arc / sweep flags, which may be written without
 * separators) and scientific notation parse correctly.
 *
 * DOM-free and pure so it is unit-testable.
 */

export interface PathCommand {
	/** Command letter, case preserved (uppercase = absolute, lowercase = relative). */
	code: string;
	/** Numeric parameters for this single command instance. */
	values: number[];
}

const PARAM_COUNTS: Record<string, number> = {
	M: 2,
	L: 2,
	H: 1,
	V: 1,
	C: 6,
	S: 4,
	Q: 4,
	T: 2,
	A: 7,
	Z: 0
};

const isSeparator = (c: string): boolean =>
	c === ' ' || c === ',' || c === '\t' || c === '\n' || c === '\r' || c === '\f';

const isDigit = (c: string): boolean => c >= '0' && c <= '9';

/** Parse a path `d` string into a list of single-instance commands. */
export const parsePath = (d: string): PathCommand[] => {
	const commands: PathCommand[] = [];
	const n = d.length;
	let i = 0;
	let lastCode = '';

	const skipSep = (): void => {
		while (i < n && isSeparator(d[i]!)) i++;
	};

	const readNumber = (): number => {
		skipSep();
		const start = i;
		if (d[i] === '+' || d[i] === '-') i++;
		while (i < n && isDigit(d[i]!)) i++;
		if (d[i] === '.') {
			i++;
			while (i < n && isDigit(d[i]!)) i++;
		}
		if (d[i] === 'e' || d[i] === 'E') {
			i++;
			if (d[i] === '+' || d[i] === '-') i++;
			while (i < n && isDigit(d[i]!)) i++;
		}
		return parseFloat(d.slice(start, i));
	};

	// Arc large-arc/sweep flags are a single `0` or `1`, possibly unseparated.
	const readFlag = (): number => {
		skipSep();
		const flag = d[i] === '1' ? 1 : 0;
		i++;
		return flag;
	};

	while (i < n) {
		skipSep();
		if (i >= n) break;

		let code: string;
		const ch = d[i]!;
		if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
			code = ch;
			i++;
		} else {
			// Implicit repeat of the previous command (M/m repeats as L/l).
			if (!lastCode) break;
			code = lastCode === 'M' ? 'L' : lastCode === 'm' ? 'l' : lastCode;
		}

		const upper = code.toUpperCase();
		const count = PARAM_COUNTS[upper];
		if (count === undefined) break; // unknown command — stop defensively.

		const values: number[] = [];
		if (upper === 'A') {
			values.push(
				readNumber(), // rx
				readNumber(), // ry
				readNumber(), // x-axis-rotation
				readFlag(), // large-arc-flag
				readFlag(), // sweep-flag
				readNumber(), // x
				readNumber() // y
			);
		} else {
			for (let k = 0; k < count; k++) values.push(readNumber());
		}

		commands.push({ code, values });
		lastCode = code;
	}

	return commands;
};
