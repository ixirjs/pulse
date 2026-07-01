/**
 * Stateless FLIP animator.
 *
 * Delegates the actual transform interpolation to the shared `animate()`
 * runtime so:
 *
 * - We compose with sibling `animate()` calls on the same element via the
 *   `--motion-x / --motion-y / --motion-scale-x / --motion-scale-y` custom
 *   properties (no clobbered `transform` shorthand).
 * - Ancestor `animate()` transforms are transparently ignored when we
 *   measure (see {@link measure}).
 * - All teardown — finalStyles, transform-wiring, registry refcount — is
 *   handled by the controller returned by `animate()`.
 *
 * The opacity crossfade is animated alongside the transform components in
 * the same controller so a single `cancel()` aborts the whole effect.
 */

import { animate } from '$lib/animate/core/animate';
import { buildFlipProps } from '$lib/animate/flip';
import type { AnimationController, MotionElement } from '$lib/animate/types';
import { isIdentityDelta, rectsEqual, resolveFlipDelta } from '../geometry';
import type { FlipDelta } from '../geometry';
import { isBrowser, shouldReduceMotion } from '$lib/shared/browser';
import { DEFAULT_DELAY, resolveDuration, resolveEasing, resolveOpacity } from '../options';
import type { FlipAnimateArgs } from '../types';

/**
 * Parse a CSS `transform-origin` computed value (always in `px` in computed
 * styles, e.g. `"160px 80px"`) into numeric pixel offsets from the
 * element's top-left corner.
 */
const parseTransformOrigin = (value: string): { ox: number; oy: number } => {
	const [x = '0', y = '0'] = value.split(' ');
	return {
		ox: Number.parseFloat(x) || 0,
		oy: Number.parseFloat(y) || 0
	};
};

/**
 * Optionally disable `pointer-events` for the duration of the animation,
 * returning a callback that restores the previous inline value. When disabling
 * is not requested the restore callback is a no-op, so callers can invoke it
 * unconditionally on teardown.
 */
const suppressPointerEvents = (
	element: MotionElement,
	enabled: boolean | undefined
): (() => void) => {
	if (!enabled) return () => {};
	const previous = element.style.pointerEvents;
	element.style.pointerEvents = 'none';
	return () => {
		element.style.pointerEvents = previous;
	};
};

/**
 * Fold the element's transform-origin into the translate components so we never
 * need to override `transform-origin` with an inline style.
 *
 * Derivation: when the origin is at (ox, oy), scaling by (sx, sy) shifts the
 * visual top-left by (ox*(sx-1), oy*(sy-1)); we compensate that in dx/dy.
 * Returns the delta unchanged for identity scale — skipping the
 * `getComputedStyle` read on the common translate-only path.
 */
const compensateTransformOrigin = (delta: FlipDelta, element: MotionElement): FlipDelta => {
	if (delta.sx === 1 && delta.sy === 1) return delta;
	const { ox, oy } = parseTransformOrigin(getComputedStyle(element).transformOrigin);
	if (ox === 0 && oy === 0) return delta;
	return {
		...delta,
		dx: delta.dx + ox * (delta.sx - 1),
		dy: delta.dy + oy * (delta.sy - 1)
	};
};

/**
 * Animate `element` from `from` to `to` using the inverse-transform FLIP
 * technique. Caller owns the `from`/`to` rects.
 *
 * Returns the underlying `AnimationController`, or `null` when no work was
 * needed (e.g. equal rects, reduced motion, zero duration, identity delta).
 */
export const animateFlip = ({
	element,
	from,
	to,
	options = {},
	forward = false
}: FlipAnimateArgs): AnimationController | null => {
	if (!isBrowser()) return null;
	if (rectsEqual(from, to)) return null;

	const reduced = shouldReduceMotion(options.respectReducedMotion);
	const rects = { from, to };

	if (options.disabled || reduced) {
		options.onStart?.(element, rects);
		options.onEnd?.(element, { finished: true, rects });
		return null;
	}

	const delta = compensateTransformOrigin(
		resolveFlipDelta(from, to, forward, {
			translate: options.translate,
			scale: options.scale
		}),
		element
	);

	const opacity = resolveOpacity(options.opacity);

	if (isIdentityDelta(delta) && !opacity) return null;

	const duration = resolveDuration(options.duration, rects);
	if (duration === 0) return null;

	// Build the prop set fed to animate(). Each prop animates an independent
	// CSS variable so this never collides with concurrent animate() calls.
	const props = buildFlipProps(delta, forward);
	if (opacity) {
		props.opacity = [opacity.from, opacity.to];
	}

	const restorePointerEvents = suppressPointerEvents(element, options.disablePointerEvents);

	return animate(element, props, {
		duration,
		easing: resolveEasing(options.easing),
		delay: options.delay ?? DEFAULT_DELAY,
		composite: options.composite ?? 'replace',
		respectReducedMotion: false, // already gated above
		onStart: (el) => options.onStart?.(el, rects),
		onEnd: (el, info) => {
			restorePointerEvents();
			options.onEnd?.(el, { finished: info.finished, rects });
		}
	});
};
