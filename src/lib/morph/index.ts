/**
 * SVG path morphing — tween an SVG `<path>`'s `d` between two shapes, which
 * WAAPI cannot do across arbitrary command lists.
 */

export { morph } from './morph.js';
export type { MorphOptions, MorphController } from './morph.js';
export { parsePath } from './parse.js';
export type { PathCommand } from './parse.js';
export { normalizePath } from './normalize.js';
export type { Subpath, CubicSegment, Point } from './normalize.js';
