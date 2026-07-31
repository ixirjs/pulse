/**
 * SVG path morphing — tween an SVG `<path>`'s `d` between two shapes, which
 * WAAPI cannot do across arbitrary command lists.
 */

export { morph } from './morph';
export type { MorphOptions, MorphController } from './morph';
export { parsePath } from './parse';
export type { PathCommand } from './parse';
export { normalizePath } from './normalize';
export type { Subpath, CubicSegment, Point } from './normalize';
