/**
 * Pure geometry primitives for FLIP — no DOM mutation, no side effects.
 *
 * This is a thin flip-layer surface: `rectsEqual` and `diagonal` live here,
 * while delta math (`computeDelta`, `isIdentityDelta`) and the transform-aware
 * rect reader (`measure`, aliased to `captureRect`) are owned by the lower
 * `animate()` layer and re-exported so flip consumers keep a single import.
 */

import { captureRect, captureVisualRect } from '$lib/animate/flip';
import type { FlipRect } from './types';

/** Read the element's layout rect, suppressing any in-flight motion transforms. */
export const measure = captureRect;

/** Read the element's live visual rect, keeping its own in-flight transform. */
export const measureVisual = captureVisualRect;

/** Approximate equality so sub-pixel jitter doesn't trigger reflows. */
export const rectsEqual = (a: FlipRect, b: FlipRect, epsilon = 0.5): boolean =>
	Math.abs(a.x - b.x) < epsilon &&
	Math.abs(a.y - b.y) < epsilon &&
	Math.abs(a.width - b.width) < epsilon &&
	Math.abs(a.height - b.height) < epsilon;

/** Diagonal distance between two rects' top-left corners. */
export const diagonal = (a: FlipRect, b: FlipRect): number =>
	Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

// Delta math is owned by the lower `animate` layer — re-export so flip-layer
// consumers keep a single `./geometry` import surface.
export { computeDelta, isIdentityDelta, resolveFlipDelta } from '$lib/animate/flip';
export type { FlipDelta, DeltaOptions } from '$lib/animate/flip';
