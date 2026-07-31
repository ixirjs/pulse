/**
 * Resolve the `from` / `to` endpoints for each prop and group them by their
 * effective timing so we issue a single WAAPI animation per timing bucket.
 */

import { VAR_BIT, type PropDef } from '../properties/properties';
import type { AnimatableValue, AnimateDefaults, AnimateProps, MotionElement } from '../types';
import { normalizeInput, resolveTiming } from './normalize';
import { isBrowser } from '../../shared/browser';
import { isAutoKeyword, measureKeywordValue } from './keyword';
import {
	formatValue,
	readCurrentValue,
	resolveProp,
	toKeyframeKey
} from '../properties/prop-utils';

export interface KeyframeGroup {
	timing: { duration: number; easing: string; delay: number };
	keyframes: Record<string, string[]>;
	/**
	 * Explicit keyframe offsets (0–1) for a multi-stop sequence. Present only
	 * for groups carrying a single offset-bearing prop, so it never conflicts
	 * with the even spacing of merged props.
	 */
	offset?: readonly number[];
}

export interface CssWrite {
	css: string;
	value: string;
}

interface BuiltKeyframes {
	groups: KeyframeGroup[];
	/** Inline styles to write once the animation finishes. */
	finalStyles: CssWrite[];
	/**
	 * Inline styles to re-apply *after* `finalStyles` so the element stays
	 * responsive — e.g. restore `width: auto` after animating to a measured px.
	 */
	restorations: CssWrite[];
	/** True if any prop drives a transform component. */
	needsTransform: boolean;
	/** Bitmask of the transform CSS vars being animated (indices match MOTION_TRANSFORM_IDENTITIES). */
	transformBits: number;
}

const resolveFrom = (
	element: MotionElement,
	def: PropDef,
	raw: AnimatableValue | undefined,
	computed: CSSStyleDeclaration | undefined
): string => {
	if (raw == null) return readCurrentValue(element, def, computed);
	if (def.measurable && isAutoKeyword(raw)) return measureKeywordValue(element, def, raw);
	if (typeof raw === 'number') return formatValue(raw, def);
	return raw;
};

/**
 * Resolve a single keyframe stop to a CSS string. Intrinsic-size keywords are
 * measured to a concrete px value; when the stop is the sequence's last one its
 * keyword is recorded in `restorations` so it's reapplied after the animation
 * finishes. Everything else formats directly.
 */
const resolveStop = (
	element: MotionElement,
	def: PropDef,
	raw: AnimatableValue,
	restorations: CssWrite[],
	isLast: boolean
): string => {
	if (def.measurable && isAutoKeyword(raw)) {
		if (isLast) restorations.push({ css: def.css, value: raw });
		return measureKeywordValue(element, def, raw);
	}
	return formatValue(raw, def);
};

/** Linear search over groups (typically 1-3 entries). Avoids hashing the
 *  potentially huge `linear(...)` easing string used in the previous Map key.
 *  Offset-bearing groups are never reused — their explicit spacing is private
 *  to the single prop that requested it. */
const findGroup = (
	groups: KeyframeGroup[],
	timing: KeyframeGroup['timing']
): KeyframeGroup | undefined => {
	for (const group of groups) {
		const t = group.timing;
		if (
			group.offset === undefined &&
			t.duration === timing.duration &&
			t.delay === timing.delay &&
			t.easing === timing.easing
		) {
			return group;
		}
	}
};

export const buildKeyframes = (
	element: MotionElement,
	props: AnimateProps,
	defaults: AnimateDefaults
): BuiltKeyframes => {
	const groups: KeyframeGroup[] = [];
	const finalStyles: CssWrite[] = [];
	const restorations: CssWrite[] = [];
	let needsTransform = false;
	let transformBits = 0;

	// Lazily cache one `getComputedStyle()` per call — many props share it for
	// their `from` reads. Skipped entirely when every prop has an explicit `from`.
	let computed: CSSStyleDeclaration | undefined;
	const getComputed = (): CSSStyleDeclaration | undefined => {
		if (!isBrowser()) return undefined;
		return (computed ??= window.getComputedStyle(element));
	};

	for (const key of Object.keys(props)) {
		const def = resolveProp(key);
		if (def.transform) {
			needsTransform = true;
			transformBits |= VAR_BIT[def.css] ?? 0;
		}

		const config = normalizeInput(props[key]!, defaults);
		const timing = resolveTiming(config, element);

		// Resolve the keyframe stops: a multi-stop `values` sequence, or the
		// classic [from, to] pair (with `from` read from the DOM when omitted).
		let values: string[];
		let offset: readonly number[] | undefined;
		if (config.values) {
			const stops = config.values;
			const last = stops.length - 1;
			values = stops.map((v, i) => resolveStop(element, def, v, restorations, i === last));
			// Honor an explicit offset only when it lines up with the stop count.
			if (config.offset && config.offset.length === stops.length) offset = config.offset;
		} else {
			const from = config.from;
			const fromStr = resolveFrom(element, def, from, from == null ? getComputed() : undefined);
			const toStr = resolveStop(element, def, config.to!, restorations, true);
			values = [fromStr, toStr];
		}
		finalStyles.push({ css: def.css, value: values[values.length - 1]! });

		// Offset-bearing props get a private group; everything else merges by timing.
		let group = offset ? undefined : findGroup(groups, timing);
		if (!group) {
			group = { timing, keyframes: {}, offset };
			groups.push(group);
		}
		// WAAPI keyframes are keyed by camelCased IDL names; hyphenated multi-word
		// CSS props (offset-distance, stroke-dashoffset, …) are otherwise ignored.
		group.keyframes[toKeyframeKey(def.css)] = values;
	}

	return { groups, finalStyles, restorations, needsTransform, transformBits };
};
