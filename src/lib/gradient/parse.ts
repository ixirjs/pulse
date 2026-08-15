/**
 * Pure linear-gradient parsing and interpolation. DOM-free so it can be
 * unit-tested; colour-keyword resolution (which needs a canvas) lives in the
 * driver layer, which feeds already-resolved `rgb/rgba/#hex` colours here.
 */

import { lerp } from '../shared/math';

export type RGBA = readonly [r: number, g: number, b: number, a: number];

export interface GradientStop {
	color: string;
	/** Position in percent, or `null` when omitted (evenly distributed). */
	pos: number | null;
}

export interface LinearGradient {
	/** Direction in degrees (CSS convention: 0 = to top, 180 = to bottom). */
	angle: number;
	stops: GradientStop[];
}

/** Interpolate two RGBA colours channel-wise (alpha included). */
export const lerpRGBA = (a: RGBA, b: RGBA, t: number): RGBA => [
	Math.round(lerp(a[0], b[0], t)),
	Math.round(lerp(a[1], b[1], t)),
	Math.round(lerp(a[2], b[2], t)),
	lerp(a[3], b[3], t)
];

/** Parse an `rgb()/rgba()/#hex` colour string into normalized RGBA. */
export const parseRGBA = (input: string): RGBA => {
	const s = input.trim();
	if (s[0] === '#') {
		let hex = s.slice(1);
		if (hex.length === 3 || hex.length === 4) {
			hex = hex
				.split('')
				.map((c) => c + c)
				.join('');
		}
		const r = parseInt(hex.slice(0, 2), 16);
		const g = parseInt(hex.slice(2, 4), 16);
		const b = parseInt(hex.slice(4, 6), 16);
		const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
		return [r, g, b, a];
	}
	const m = s.match(/rgba?\(([^)]+)\)/i);
	if (m) {
		const parts = m[1]!
			.split(/[,/\s]+/)
			.filter(Boolean)
			.map(Number);
		return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1];
	}
	// Unknown format — fall back to transparent black rather than throwing.
	return [0, 0, 0, 1];
};

/** Format an RGBA tuple as a CSS `rgba(...)` string. */
const formatRGBA = ([r, g, b, a]: RGBA): string =>
	`rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;

/** Split a comma-separated list, ignoring commas nested in parentheses. */
const splitTopLevel = (input: string): string[] => {
	const out: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		if (ch === '(') depth++;
		else if (ch === ')') depth--;
		else if (ch === ',' && depth === 0) {
			out.push(input.slice(start, i).trim());
			start = i + 1;
		}
	}
	out.push(input.slice(start).trim());
	return out;
};

const ANGLE_KEYWORDS: Record<string, number> = {
	'to top': 0,
	'to right': 90,
	'to bottom': 180,
	'to left': 270,
	'to top right': 45,
	'to right top': 45,
	'to bottom right': 135,
	'to right bottom': 135,
	'to bottom left': 225,
	'to left bottom': 225,
	'to top left': 315,
	'to left top': 315
};

const parseAngle = (token: string): number | null => {
	const kw = ANGLE_KEYWORDS[token.trim().toLowerCase()];
	if (kw != null) return kw;
	const deg = token.trim().match(/^(-?[\d.]+)deg$/i);
	return deg ? Number(deg[1]) : null;
};

const parseStop = (token: string): GradientStop => {
	// The position (if any) is a trailing percentage token.
	const m = token.match(/^(.*?)(?:\s+([\d.]+)%)?$/);
	return { color: (m?.[1] ?? token).trim(), pos: m?.[2] != null ? Number(m[2]) : null };
};

/**
 * Parse a `linear-gradient(...)` string. The leading direction may be an angle
 * (`45deg`) or a keyword (`to right`); when absent it defaults to `180deg`.
 */
export const parseLinearGradient = (input: string): LinearGradient => {
	const inner = input
		.trim()
		.replace(/^linear-gradient\(/i, '')
		.replace(/\)$/, '');
	const parts = splitTopLevel(inner);
	let angle = 180;
	const first = parts[0] != null ? parseAngle(parts[0]) : null;
	if (first != null) {
		angle = first;
		parts.shift();
	}
	return { angle, stops: parts.map(parseStop) };
};

/** Build a `linear-gradient(...)` string from an angle and resolved stops. */
export const formatLinearGradient = (angle: number, stops: { rgba: RGBA; pos: number }[]): string =>
	`linear-gradient(${Number(angle.toFixed(2))}deg, ${stops
		.map((s) => `${formatRGBA(s.rgba)} ${Number(s.pos.toFixed(2))}%`)
		.join(', ')})`;

/**
 * Format an interpolated gradient directly from two resolved stop lists.
 *
 * The rAF driver calls this every frame. Keeping interpolation and formatting
 * together avoids allocating a tuple and object for each stop before creating
 * the unavoidable CSS string, while preserving `formatLinearGradient()`'s
 * rounding and output format.
 */
export const formatInterpolatedLinearGradient = (
	fromAngle: number,
	toAngle: number,
	fromColors: readonly RGBA[],
	toColors: readonly RGBA[],
	fromPositions: readonly number[],
	toPositions: readonly number[],
	t: number
): string => {
	let stops = '';
	for (let i = 0; i < fromColors.length; i++) {
		const from = fromColors[i]!;
		const to = toColors[i]!;
		const r = Math.round(lerp(from[0], to[0], t));
		const g = Math.round(lerp(from[1], to[1], t));
		const b = Math.round(lerp(from[2], to[2], t));
		const a = Number(lerp(from[3], to[3], t).toFixed(3));
		const pos = Number(lerp(fromPositions[i]!, toPositions[i]!, t).toFixed(2));
		if (i > 0) stops += ', ';
		stops += `rgba(${r}, ${g}, ${b}, ${a}) ${pos}%`;
	}
	return `linear-gradient(${Number(lerp(fromAngle, toAngle, t).toFixed(2))}deg, ${stops})`;
};

/** Distribute `null` stop positions evenly across `[0, 100]`. */
export const resolvePositions = (stops: GradientStop[]): number[] =>
	stops.map((s, i) =>
		s.pos != null ? s.pos : stops.length === 1 ? 0 : (i / (stops.length - 1)) * 100
	);
