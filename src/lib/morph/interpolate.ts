/**
 * Align two normalized paths to the same structure and interpolate between
 * them. Subpaths are matched index-for-index; within a pair, the one with
 * fewer cubic segments is grown to match by repeatedly splitting its longest
 * segment (De Casteljau at the midpoint), which keeps the curve identical while
 * adding interpolation anchors.
 *
 * DOM-free and pure.
 */

import { normalizePath, type CubicSegment, type Point, type Subpath } from './normalize';

const lerpPoint = (a: Point, b: Point, t: number): Point => [
	a[0] + (b[0] - a[0]) * t,
	a[1] + (b[1] - a[1]) * t
];

/** Split a cubic (whose start is `p0`) at parameter `t` into two cubics. */
const splitCubic = (p0: Point, seg: CubicSegment, t: number): [CubicSegment, CubicSegment] => {
	const p01 = lerpPoint(p0, seg.c1, t);
	const p12 = lerpPoint(seg.c1, seg.c2, t);
	const p23 = lerpPoint(seg.c2, seg.end, t);
	const p012 = lerpPoint(p01, p12, t);
	const p123 = lerpPoint(p12, p23, t);
	const mid = lerpPoint(p012, p123, t);
	return [
		{ c1: p01, c2: p012, end: mid },
		{ c1: p123, c2: p23, end: seg.end }
	];
};

/** The start point of each segment in a subpath. */
const segmentStarts = (subpath: Subpath): Point[] => {
	let prev = subpath.start;
	return subpath.segments.map((seg) => {
		const start = prev;
		prev = seg.end;
		return start;
	});
};

/** Grow a subpath to exactly `count` segments by subdividing the longest ones. */
export const subdivideTo = (subpath: Subpath, count: number): Subpath => {
	const starts = segmentStarts(subpath);
	const items = subpath.segments.map((seg, i) => ({ start: starts[i]!, seg }));

	while (items.length < count) {
		let longest = 0;
		let maxChord = -1;
		for (let i = 0; i < items.length; i++) {
			const it = items[i]!;
			const dx = it.seg.end[0] - it.start[0];
			const dy = it.seg.end[1] - it.start[1];
			const chord = dx * dx + dy * dy;
			if (chord > maxChord) {
				maxChord = chord;
				longest = i;
			}
		}
		const it = items[longest]!;
		const [left, right] = splitCubic(it.start, it.seg, 0.5);
		items.splice(longest, 1, { start: it.start, seg: left }, { start: left.end, seg: right });
	}

	return { start: subpath.start, segments: items.map((it) => it.seg), closed: subpath.closed };
};

/** Make two subpaths share an equal segment count. */
export const alignSubpaths = (a: Subpath, b: Subpath): [Subpath, Subpath] => {
	if (a.segments.length < b.segments.length) return [subdivideTo(a, b.segments.length), b];
	if (b.segments.length < a.segments.length) return [a, subdivideTo(b, a.segments.length)];
	return [a, b];
};

const dist2 = (a: Point, b: Point): number => {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	return dx * dx + dy * dy;
};

/** On-path anchor points (the start point of each segment) of a subpath. */
const anchorsOf = (sp: Subpath): Point[] => {
	const out: Point[] = [sp.start];
	for (let i = 1; i < sp.segments.length; i++) out.push(sp.segments[i - 1]!.end);
	return out;
};

/**
 * Cyclically rotate a closed subpath so it begins `k` anchors later. The curve
 * is geometrically identical — only the starting anchor (and therefore the
 * point-correspondence with another path) changes.
 */
export const rotateClosed = (sp: Subpath, k: number): Subpath => {
	const n = sp.segments.length;
	const r = ((k % n) + n) % n;
	if (r === 0) return sp;
	return {
		start: sp.segments[r - 1]!.end,
		segments: [...sp.segments.slice(r), ...sp.segments.slice(0, r)],
		closed: sp.closed
	};
};

/** Reverse a closed subpath's winding (same start anchor, opposite direction). */
export const reverseClosed = (sp: Subpath): Subpath => {
	const n = sp.segments.length;
	const anchors = anchorsOf(sp);
	const segments: CubicSegment[] = [];
	for (let j = 0; j < n; j++) {
		const src = sp.segments[(n - 1 - j + n) % n]!;
		segments.push({ c1: src.c2, c2: src.c1, end: anchors[(n - 1 - j) % n]! });
	}
	return { start: sp.start, segments, closed: sp.closed };
};

/**
 * Choose the orientation of `from` (cyclic rotation, optionally reversed) that
 * minimizes total squared anchor distance to `to`, so paired points travel the
 * shortest path and the morph doesn't visibly twist. Only applies to closed
 * rings of equal segment count; open paths are returned unchanged (their start
 * and end are fixed and must not rotate).
 */
export const minimizeAnchorTravel = (from: Subpath, to: Subpath): Subpath => {
	const n = from.segments.length;
	if (!from.closed || !to.closed || n < 2 || to.segments.length !== n) return from;

	const target = anchorsOf(to);
	let best = from;
	let bestCost = Infinity;

	for (const candidate of [from, reverseClosed(from)]) {
		const anchors = anchorsOf(candidate);
		for (let k = 0; k < n; k++) {
			let cost = 0;
			for (let i = 0; i < n; i++) cost += dist2(anchors[(i + k) % n]!, target[i]!);
			if (cost < bestCost) {
				bestCost = cost;
				best = k === 0 ? candidate : rotateClosed(candidate, k);
			}
		}
	}
	return best;
};

const interpolateSubpath = (a: Subpath, b: Subpath, t: number): Subpath => ({
	start: lerpPoint(a.start, b.start, t),
	segments: a.segments.map((sa, i) => {
		const sb = b.segments[i]!;
		return {
			c1: lerpPoint(sa.c1, sb.c1, t),
			c2: lerpPoint(sa.c2, sb.c2, t),
			end: lerpPoint(sa.end, sb.end, t)
		};
	}),
	closed: t < 0.5 ? a.closed : b.closed
});

const num = (n: number): string => {
	const r = Math.round(n * 1000) / 1000;
	return Object.is(r, -0) ? '0' : String(r);
};

const point = (p: Point): string => `${num(p[0])} ${num(p[1])}`;

/** Serialize normalized cubic subpaths back into a path `d` string. */
export const toPathString = (subpaths: Subpath[]): string =>
	subpaths
		.map((sp) => {
			const head = `M${point(sp.start)}`;
			const body = sp.segments
				.map((s) => `C${point(s.c1)} ${point(s.c2)} ${point(s.end)}`)
				.join('');
			return head + body + (sp.closed ? 'Z' : '');
		})
		.join('');

export interface MorphPlan {
	/** Whether the two paths share a structure that can be morphed point-for-point. */
	compatible: boolean;
	from: Subpath[];
	to: Subpath[];
}

/**
 * Build a morph plan: normalize both paths and align them subpath-by-subpath.
 * `compatible` is false when the subpath counts differ — callers should snap to
 * the target in that case.
 *
 * When `optimize` is true (default), each closed subpath's `from` orientation is
 * rotated/reversed to minimize anchor travel against its `to` (see
 * {@link minimizeAnchorTravel}), so the morph takes the shortest path.
 */
export const planMorph = (from: string, to: string, optimize = true): MorphPlan => {
	const fromPaths = normalizePath(from);
	const toPaths = normalizePath(to);
	if (fromPaths.length !== toPaths.length) {
		return { compatible: false, from: fromPaths, to: toPaths };
	}
	const fromAligned: Subpath[] = [];
	const toAligned: Subpath[] = [];
	for (let i = 0; i < fromPaths.length; i++) {
		const [a, b] = alignSubpaths(fromPaths[i]!, toPaths[i]!);
		fromAligned.push(optimize ? minimizeAnchorTravel(a, b) : a);
		toAligned.push(b);
	}
	return { compatible: true, from: fromAligned, to: toAligned };
};

/** Interpolate a prepared, aligned plan at progress `t` into a `d` string. */
export const interpolatePlan = (plan: MorphPlan, t: number): string =>
	toPathString(plan.from.map((sp, i) => interpolateSubpath(sp, plan.to[i]!, t)));
