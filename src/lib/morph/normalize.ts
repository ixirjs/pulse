/**
 * Normalize parsed path commands into absolute cubic-bezier subpaths — the one
 * representation every command can be expressed in, which makes interpolation a
 * matter of lerping control points. Handles `M L H V C S Q T A Z` (relative and
 * absolute); lines become cubics with thirds-placed controls, quadratics are
 * elevated to cubics, and arcs are converted to ≤90° cubic segments.
 *
 * DOM-free and pure.
 */

import { parsePath, type PathCommand } from './parse';

export type Point = [number, number];

export interface CubicSegment {
	c1: Point;
	c2: Point;
	end: Point;
}

export interface Subpath {
	start: Point;
	segments: CubicSegment[];
	closed: boolean;
}

const lineToCubic = (sx: number, sy: number, ex: number, ey: number): CubicSegment => ({
	c1: [sx + (ex - sx) / 3, sy + (ey - sy) / 3],
	c2: [sx + (2 * (ex - sx)) / 3, sy + (2 * (ey - sy)) / 3],
	end: [ex, ey]
});

const quadToCubic = (
	sx: number,
	sy: number,
	qx: number,
	qy: number,
	ex: number,
	ey: number
): CubicSegment => ({
	c1: [sx + (2 / 3) * (qx - sx), sy + (2 / 3) * (qy - sy)],
	c2: [ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey)],
	end: [ex, ey]
});

/** Convert an elliptical arc to a series of cubic segments (SVG spec algorithm). */
const arcToCubics = (
	x1: number,
	y1: number,
	rxIn: number,
	ryIn: number,
	phiDeg: number,
	fa: number,
	fs: number,
	x2: number,
	y2: number
): CubicSegment[] => {
	let rx = Math.abs(rxIn);
	let ry = Math.abs(ryIn);
	if (rx === 0 || ry === 0) return [lineToCubic(x1, y1, x2, y2)];

	const phi = (phiDeg * Math.PI) / 180;
	const sinPhi = Math.sin(phi);
	const cosPhi = Math.cos(phi);

	const dx = (x1 - x2) / 2;
	const dy = (y1 - y2) / 2;
	const x1p = cosPhi * dx + sinPhi * dy;
	const y1p = -sinPhi * dx + cosPhi * dy;

	const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
	if (lambda > 1) {
		const s = Math.sqrt(lambda);
		rx *= s;
		ry *= s;
	}

	const sign = fa === fs ? -1 : 1;
	const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
	const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
	const co = sign * Math.sqrt(Math.max(0, num / den));
	const cxp = (co * rx * y1p) / ry;
	const cyp = (-co * ry * x1p) / rx;
	const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
	const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

	const angle = (ux: number, uy: number, vx: number, vy: number): number => {
		const dot = ux * vx + uy * vy;
		const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
		let a = Math.acos(Math.min(1, Math.max(-1, len === 0 ? 1 : dot / len)));
		if (ux * vy - uy * vx < 0) a = -a;
		return a;
	};

	const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
	let dTheta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
	if (!fs && dTheta > 0) dTheta -= 2 * Math.PI;
	if (fs && dTheta < 0) dTheta += 2 * Math.PI;

	const segs = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
	const delta = dTheta / segs;
	const t = ((8 / 3) * Math.sin(delta / 4) * Math.sin(delta / 4)) / Math.sin(delta / 2);

	const pointAt = (ang: number): Point => {
		const cosA = Math.cos(ang);
		const sinA = Math.sin(ang);
		return [
			cx + rx * cosPhi * cosA - ry * sinPhi * sinA,
			cy + rx * sinPhi * cosA + ry * cosPhi * sinA
		];
	};
	const derivAt = (ang: number): Point => {
		const cosA = Math.cos(ang);
		const sinA = Math.sin(ang);
		return [-rx * cosPhi * sinA - ry * sinPhi * cosA, -rx * sinPhi * sinA + ry * cosPhi * cosA];
	};

	const result: CubicSegment[] = [];
	let curAngle = theta1;
	let [startX, startY] = [x1, y1];
	for (let s = 0; s < segs; s++) {
		const endAngle = curAngle + delta;
		const [ex, ey] = pointAt(endAngle);
		const [dsx, dsy] = derivAt(curAngle);
		const [dex, dey] = derivAt(endAngle);
		result.push({
			c1: [startX + t * dsx, startY + t * dsy],
			c2: [ex - t * dex, ey - t * dey],
			end: [ex, ey]
		});
		curAngle = endAngle;
		startX = ex;
		startY = ey;
	}
	return result;
};

/** Normalize a parsed path (or raw `d` string) into absolute cubic subpaths. */
export const normalizePath = (input: string | PathCommand[]): Subpath[] => {
	const commands = typeof input === 'string' ? parsePath(input) : input;
	const subpaths: Subpath[] = [];

	let current: Subpath | null = null;
	let cx = 0;
	let cy = 0;
	let sx = 0;
	let sy = 0;
	// Last control point + kind, for S/T smooth-curve reflection.
	let lastControl: Point | null = null;
	let lastKind: 'cubic' | 'quad' | null = null;

	const push = (seg: CubicSegment): void => {
		current?.segments.push(seg);
		cx = seg.end[0];
		cy = seg.end[1];
	};

	for (const { code, values: v } of commands) {
		const rel = code >= 'a' && code <= 'z';
		const upper = code.toUpperCase();
		const ax = (n: number): number => (rel ? cx + n : n);
		const ay = (n: number): number => (rel ? cy + n : n);

		switch (upper) {
			case 'M': {
				const x = ax(v[0]!);
				const y = ay(v[1]!);
				if (current) subpaths.push(current);
				current = { start: [x, y], segments: [], closed: false };
				cx = sx = x;
				cy = sy = y;
				lastControl = null;
				lastKind = null;
				break;
			}
			case 'L': {
				push(lineToCubic(cx, cy, ax(v[0]!), ay(v[1]!)));
				lastControl = null;
				lastKind = null;
				break;
			}
			case 'H': {
				push(lineToCubic(cx, cy, rel ? cx + v[0]! : v[0]!, cy));
				lastControl = null;
				lastKind = null;
				break;
			}
			case 'V': {
				push(lineToCubic(cx, cy, cx, rel ? cy + v[0]! : v[0]!));
				lastControl = null;
				lastKind = null;
				break;
			}
			case 'C': {
				const c1: Point = [ax(v[0]!), ay(v[1]!)];
				const c2: Point = [ax(v[2]!), ay(v[3]!)];
				push({ c1, c2, end: [ax(v[4]!), ay(v[5]!)] });
				lastControl = c2;
				lastKind = 'cubic';
				break;
			}
			case 'S': {
				const c1: Point =
					lastKind === 'cubic' && lastControl
						? [2 * cx - lastControl[0], 2 * cy - lastControl[1]]
						: [cx, cy];
				const c2: Point = [ax(v[0]!), ay(v[1]!)];
				push({ c1, c2, end: [ax(v[2]!), ay(v[3]!)] });
				lastControl = c2;
				lastKind = 'cubic';
				break;
			}
			case 'Q': {
				const qc: Point = [ax(v[0]!), ay(v[1]!)];
				const ex = ax(v[2]!);
				const ey = ay(v[3]!);
				push(quadToCubic(cx, cy, qc[0], qc[1], ex, ey));
				lastControl = qc;
				lastKind = 'quad';
				break;
			}
			case 'T': {
				const qc: Point =
					lastKind === 'quad' && lastControl
						? [2 * cx - lastControl[0], 2 * cy - lastControl[1]]
						: [cx, cy];
				const ex = ax(v[0]!);
				const ey = ay(v[1]!);
				push(quadToCubic(cx, cy, qc[0], qc[1], ex, ey));
				lastControl = qc;
				lastKind = 'quad';
				break;
			}
			case 'A': {
				const ex = rel ? cx + v[5]! : v[5]!;
				const ey = rel ? cy + v[6]! : v[6]!;
				for (const seg of arcToCubics(cx, cy, v[0]!, v[1]!, v[2]!, v[3]!, v[4]!, ex, ey)) {
					push(seg);
				}
				lastControl = null;
				lastKind = null;
				break;
			}
			case 'Z': {
				if (current) {
					if (cx !== sx || cy !== sy) push(lineToCubic(cx, cy, sx, sy));
					current.closed = true;
				}
				cx = sx;
				cy = sy;
				lastControl = null;
				lastKind = null;
				break;
			}
		}
	}
	if (current) subpaths.push(current);
	return subpaths;
};
