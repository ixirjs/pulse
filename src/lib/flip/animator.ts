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

import { animate } from "$lib/animate/animate";
import type {
  AnimateProps,
  AnimationController,
} from "$lib/animate/types";
import { computeDelta, isIdentityDelta, rectsEqual } from "./geometry";
import { isBrowser, prefersReducedMotion } from "$lib/shared/browser";
import {
  DEFAULT_DELAY,
  resolveDuration,
  resolveEasing,
  resolveOpacity,
} from "./options";
import type { FlipAnimateArgs } from "./types";

/**
 * Parse a CSS `transform-origin` computed value (always in `px` in computed
 * styles, e.g. `"160px 80px"`) into numeric pixel offsets from the
 * element's top-left corner.
 */
const parseTransformOrigin = (value: string): { ox: number; oy: number } => {
  const parts = value.split(" ")
  return {
    ox: Number.parseFloat(parts[0] ?? "0") || 0,
    oy: Number.parseFloat(parts[1] ?? "0") || 0,
  }
}

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
  forward = false,
}: FlipAnimateArgs): AnimationController | null => {
  if (!isBrowser()) return null;
  if (rectsEqual(from, to)) return null;

  const reduced =
    (options.respectReducedMotion ?? true) && prefersReducedMotion();
  const rects = { from, to };

  if (options.disabled || reduced) {
    options.onStart?.(element, rects);
    options.onEnd?.(element, { finished: true, rects });
    return null;
  }

  let delta = computeDelta(
    // Forward mode: the DOM is at `from`; we drive the element visually toward
    // `to` by computing the offset as (to − from) — i.e. swap the rect pair so
    // computeDelta returns the forward rather than the inverse transform.
    forward ? { from: to, to: from } : rects,
    {
      translate: options.translate,
      scale: options.scale,
    },
  );

  // Adjust the translation to account for the element's actual transform-origin
  // so we never need to override it with an inline style.
  // Derivation: when origin is at (ox, oy), scaling by (sx, sy) shifts the
  // visual top-left by (ox*(sx-1), oy*(sy-1)), so we compensate in dx/dy.
  // Only relevant when scale is non-identity — skip the getComputedStyle call otherwise.
  if (delta.sx !== 1 || delta.sy !== 1) {
    const { ox, oy } = parseTransformOrigin(
      getComputedStyle(element).transformOrigin,
    )
    if (ox !== 0 || oy !== 0) {
      delta = {
        ...delta,
        dx: delta.dx + ox * (delta.sx - 1),
        dy: delta.dy + oy * (delta.sy - 1),
      }
    }
  }

  const opacity = resolveOpacity(options.opacity);

  if (isIdentityDelta(delta) && !opacity) return null;

  const duration = resolveDuration(options.duration, rects);
  if (duration === 0) return null;

  // Build the prop set fed to animate(). Each prop animates an independent
  // CSS variable so this never collides with concurrent animate() calls.
  //
  // Standard (inverse) FLIP: DOM is at `to`. Apply [Δ→0] so visual starts at
  // `from` and lands at `to` (the DOM position) at rest.
  //
  // Forward FLIP: DOM is at `from`. Apply [0→Δ] so visual starts at `from`
  // (no transform) and lands at `to` (the logical target) at the end.
  const props: AnimateProps = forward
    ? {
        flipX:      ["0px", `${delta.dx}px`],
        flipY:      ["0px", `${delta.dy}px`],
        flipScaleX: ["1", `${delta.sx}`],
        flipScaleY: ["1", `${delta.sy}`],
      }
    : {
        flipX:      [`${delta.dx}px`, "0px"],
        flipY:      [`${delta.dy}px`, "0px"],
        flipScaleX: [`${delta.sx}`, "1"],
        flipScaleY: [`${delta.sy}`, "1"],
      };
  if (opacity) {
    props.opacity = [opacity.from, opacity.to];
  }

  // Capture inline state we mutate so we can restore it on teardown.
  const previousPointerEvents = options.disablePointerEvents
    ? element.style.pointerEvents
    : null;
  if (options.disablePointerEvents) element.style.pointerEvents = "none";

  const restoreElementStyles = (): void => {
    if (previousPointerEvents != null) {
      element.style.pointerEvents = previousPointerEvents;
    }
  };

  const controller = animate(element, props, {
    duration,
    easing: resolveEasing(options.easing),
    delay: options.delay ?? DEFAULT_DELAY,
    composite: options.composite ?? "replace",
    respectReducedMotion: false, // already gated above
    onStart: (el) => options.onStart?.(el, rects),
    onEnd: (el, info) => {
      restoreElementStyles();
      options.onEnd?.(el, { finished: info.finished, rects });
    },
  });

  return controller;
};
