/**
 * Fold transform-variable keyframes into direct `translate` / `scale` /
 * `rotate` keyframes.
 *
 * `animate()` drives transforms through registered custom properties so that
 * independent animations compose on one element — FLIP offsets, a drag, and a
 * sibling `animate()` each own their own var and never clobber a shared
 * `transform`. Chromium cannot run a custom-property animation on the
 * compositor, and one such property in an effect pins the whole effect
 * (opacity included) to the main thread. A dialog morph therefore costs a style
 * recalc and a full repaint every frame.
 *
 * When nothing else is composing on the element, the same motion can be
 * expressed directly: evaluate the transform template once per keyframe stop,
 * substituting each animated var with its stop value and every other var with
 * its current computed value. The result is a plain transform keyframe the
 * compositor accepts. The fold is reversible — the tracker demotes back to the
 * variable form as soon as anything else touches the element — so the
 * composition contract still holds.
 */

import { TRANSFORM_TEMPLATES } from '../properties/properties';
import type { KeyframeGroup } from './keyframes';

/** A CSS property whose value is composed from motion vars. */
export type TransformTarget = keyof typeof TRANSFORM_TEMPLATES;

export const TRANSFORM_TARGETS = Object.keys(TRANSFORM_TEMPLATES) as TransformTarget[];

/** A template is a run of literal text and `var()` references. */
type TemplatePart = string | { name: string; fallback: string };

const VAR_RE = /var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]*))?\)/gi;

const parseTemplate = (template: string): TemplatePart[] => {
	const parts: TemplatePart[] = [];
	let last = 0;
	for (const match of template.matchAll(VAR_RE)) {
		const at = match.index;
		if (at > last) parts.push(template.slice(last, at));
		parts.push({ name: match[1]!, fallback: (match[2] ?? '').trim() });
		last = at + match[0].length;
	}
	if (last < template.length) parts.push(template.slice(last));
	return parts;
};

const TEMPLATE_PARTS = Object.fromEntries(
	TRANSFORM_TARGETS.map((target) => [target, parseTemplate(TRANSFORM_TEMPLATES[target])])
) as Record<TransformTarget, TemplatePart[]>;

/** One transform property that can be driven directly for this `animate()` call. */
export interface FoldPlan {
	target: TransformTarget;
	/** Index into the groups array — the single group holding every animated var. */
	groupIndex: number;
	/** Variable keyframe keys the folded keyframe replaces. */
	varKeys: string[];
	/** The substituted template, one entry per keyframe stop. */
	stops: string[];
}

/**
 * Work out which transform properties can be driven directly.
 *
 * A target is foldable only when we installed its template (a caller's own
 * `translate` stays authoritative), at least one of its vars is animated, and
 * every animated var it reads sits in one timing group with the same number of
 * stops — per-axis springs keep their independent timing on the variable path.
 *
 * Pure: reads the DOM only through `readVar`, and mutates nothing.
 */
export const planFolds = (
	groups: readonly KeyframeGroup[],
	readVar: (name: string) => string,
	isOwned: (target: TransformTarget) => boolean
): FoldPlan[] => {
	const plans: FoldPlan[] = [];
	for (const target of TRANSFORM_TARGETS) {
		if (!isOwned(target)) continue;
		const parts = TEMPLATE_PARTS[target]!;
		const varKeys: string[] = [];
		let groupIndex = -1;
		let stopCount = 0;
		let foldable = true;
		for (const part of parts) {
			if (typeof part === 'string') continue;
			const index = groups.findIndex((group) => part.name in group.keyframes);
			if (index === -1) continue;
			const stops = groups[index]!.keyframes[part.name]!;
			if (groupIndex === -1) {
				groupIndex = index;
				stopCount = stops.length;
			} else if (index !== groupIndex || stops.length !== stopCount) {
				// Channels of one target on different timings cannot collapse into
				// a single keyframe list.
				foldable = false;
				break;
			}
			varKeys.push(part.name);
		}
		if (!foldable || groupIndex === -1) continue;

		const { keyframes } = groups[groupIndex]!;
		const stops: string[] = [];
		for (let stop = 0; stop < stopCount; stop++) {
			let value = '';
			for (const part of parts) {
				if (typeof part === 'string') {
					value += part;
					continue;
				}
				const animated = keyframes[part.name];
				value += animated ? animated[stop]! : readVar(part.name) || part.fallback;
			}
			stops.push(value);
		}
		plans.push({ target, groupIndex, varKeys, stops });
	}
	return plans;
};

/**
 * Rewrite the groups in place per plan, returning each touched group's original
 * keyframes so the fold can be undone later. The variable keys are removed, not
 * merely shadowed: leaving a custom property in the effect would pin it to the
 * main thread again and defeat the whole exercise.
 */
export const applyFolds = (
	groups: KeyframeGroup[],
	plans: readonly FoldPlan[]
): Map<number, Record<string, string[]>> => {
	const originals = new Map<number, Record<string, string[]>>();
	for (const plan of plans) {
		const group = groups[plan.groupIndex]!;
		if (!originals.has(plan.groupIndex)) originals.set(plan.groupIndex, { ...group.keyframes });
		for (const key of plan.varKeys) delete group.keyframes[key];
		group.keyframes[plan.target] = plan.stops;
	}
	return originals;
};
