/**
 * `animate(element, props, defaults?)` — a tiny WAAPI animation runtime.
 *
 * Features:
 *  - Spring physics: `{ scale: { to: 1.2, spring: { stiffness: 200 } } }`.
 *  - Finite-value or `[from, to]` shorthands per property.
 *  - Per-prop `duration`, `easing`, `delay` overriding shared defaults.
 *  - Independent transform components (x / y / scale / rotate) animate via
 *    registered CSS custom properties so they never clobber each other.
 *
 * @example
 * ```ts
 * animate(node, {
 *   x: 120,                                          // current → 120px
 *   opacity: [0, 1],                                 // 0 → 1
 *   scale: { to: 1.1, spring: { stiffness: 220 } },  // springy bounce
 *   rotate: { to: 90, duration: 600, easing: 'easeInOut' },
 * }, { duration: 350 });
 * ```
 */

import { createController, noopController } from './controller';
import { buildKeyframes, type KeyframeGroup } from '../keyframes/keyframes';
import { normalizeInput } from '../keyframes/normalize';
import {
	demoteFoldedTransforms,
	deregisterTransformAnimation,
	hasActiveTransforms,
	registerFoldedTransforms,
	registerTransformAnimation,
	type FoldedTransform
} from '../properties/properties';
import {
	ensurePropertiesRegistered,
	ensureTransformWired,
	isTransformOwned,
	wireTransform
} from '../properties/transform-setup';
import { applyFolds, planFolds } from '../keyframes/fold';
import type { AnimateDefaults, AnimateProps, AnimationController, MotionElement } from '../types';
import { isBrowser, shouldReduceMotion } from '../../shared/browser';
import { formatValue, resolveProp } from '../properties/prop-utils';

/**
 * Animate one or more properties on an element using the Web Animations API.
 * Returns a controller for the underlying animations.
 */
export const animate = (
	element: MotionElement,
	props: AnimateProps,
	defaults: AnimateDefaults = {}
): AnimationController => {
	if (!isBrowser()) return noopController(element, defaults);

	if (shouldReduceMotion(defaults.respectReducedMotion)) {
		return applyEndStateImmediately(element, props, defaults);
	}

	ensurePropertiesRegistered();

	const { groups, finalStyles, restorations, needsTransform, transformBits } = buildKeyframes(
		element,
		props,
		defaults
	);

	if (groups.length === 0) {
		// Nothing to animate — skip transform wiring entirely.
		return noopController(element, defaults);
	}

	// Read before registering: an element with no transform channel in flight is
	// one whose transform we can drive directly for the length of this call.
	const canFold = needsTransform && !hasActiveTransforms(element);

	if (needsTransform) {
		ensureTransformWired(element);
		registerTransformAnimation(element, transformBits);
	}

	const folds = canFold ? foldTransforms(element, groups) : [];
	const animations = buildAnimations(element, groups, defaults);
	if (folds.length > 0) {
		registerFoldedTransforms(
			element,
			folds.map(({ groupIndex, varFrames, targets }) => ({
				animation: animations[groupIndex]!,
				varFrames,
				targets
			}))
		);
	}

	return createController({
		element,
		animations,
		defaults,
		finalStyles,
		restorations,
		onTeardown: needsTransform
			? () => {
					demoteFoldedTransforms(element);
					deregisterTransformAnimation(element, transformBits);
				}
			: undefined
	});
};

type PendingFold = Omit<FoldedTransform, 'animation'> & { groupIndex: number };

/**
 * Collapse this call's transform-variable keyframes into direct
 * `translate` / `scale` / `rotate` keyframes wherever possible, so Chromium can
 * run them on the compositor instead of recalculating style every frame.
 * Mutates `groups`, and returns what the tracker needs to undo the fold.
 */
const foldTransforms = (element: MotionElement, groups: KeyframeGroup[]): PendingFold[] => {
	const computed = window.getComputedStyle(element);
	const plans = planFolds(
		groups,
		(name) => computed.getPropertyValue(name).trim(),
		// An unset inline value means the template never took (no CSS typed-OM
		// support for these properties), leaving nothing to fold onto.
		(target) => isTransformOwned(element, target) && !!element.style.getPropertyValue(target)
	);
	if (plans.length === 0) return [];
	const originals = applyFolds(groups, plans);
	return [...originals].map(([groupIndex, keyframes]) => {
		const { offset } = groups[groupIndex]!;
		return {
			groupIndex,
			varFrames: (offset ? { ...keyframes, offset } : keyframes) as PropertyIndexedKeyframes,
			targets: plans
				.filter((plan) => plan.groupIndex === groupIndex)
				.map((plan) => [plan.target, element.style.getPropertyValue(plan.target)] as const)
		};
	});
};

/**
 * Materialize each keyframe group into a WAAPI `Animation`, applying the shared
 * effect options (fill / composite / iterations / direction / …) from `defaults`.
 */
const buildAnimations = (
	element: MotionElement,
	groups: KeyframeGroup[],
	defaults: AnimateDefaults
): Animation[] => {
	const {
		fill = 'both',
		composite = 'replace',
		iterations = 1,
		direction = 'normal',
		iterationStart = 0,
		playbackRate = 1
	} = defaults;
	return groups.map(({ timing: t, keyframes, offset }) => {
		// A multi-stop group may carry explicit offsets; WAAPI reads `offset` as a
		// special key inside the property-indexed keyframes object.
		const frames = (offset ? { ...keyframes, offset } : keyframes) as PropertyIndexedKeyframes;
		const anim = element.animate(frames, {
			duration: t.duration,
			delay: t.delay,
			easing: t.easing,
			fill,
			composite,
			iterations,
			direction,
			iterationStart
		});
		if (playbackRate !== 1) anim.playbackRate = playbackRate;
		return anim;
	});
};

/**
 * When reduced motion is requested we skip animating but still apply the
 * final state so the layout matches what the caller expected.
 */
const applyEndStateImmediately = (
	element: MotionElement,
	props: AnimateProps,
	defaults: AnimateDefaults
): AnimationController => {
	let needsTransform = false;
	const style = element.style;
	for (const key of Object.keys(props)) {
		const def = resolveProp(key);
		if (def.transform) needsTransform = true;
		const { to } = normalizeInput(props[key]!, defaults);
		// `to` mirrors the last stop of a `values` sequence, so this lands on the
		// correct end-state for multi-keyframe props too.
		if (to != null) style.setProperty(def.css, formatValue(to, def));
	}
	if (needsTransform) {
		wireTransform(element);
	}
	return noopController(element, defaults);
};
