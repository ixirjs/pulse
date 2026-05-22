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

import { createController, noopController } from "./controller";
import { buildKeyframes } from "./keyframes";
import { normalizeInput } from "./normalize";
import {
  deregisterTransformAnimation,
  ensurePropertiesRegistered,
  ensureTransformWired,
  registerTransformAnimation,
} from "./properties";
import type {
  AnimateDefaults,
  AnimateProps,
  AnimationController,
} from "./types";
import { formatValue, isBrowser, prefersReducedMotion, resolveProp } from "./utils";

/**
 * Animate one or more properties on an element using the Web Animations API.
 * Returns a controller for the underlying animations.
 */
export const animate = (
  element: HTMLElement | SVGElement,
  props: AnimateProps,
  defaults: AnimateDefaults = {},
): AnimationController => {
  if (!isBrowser()) return noopController(element, defaults);

  if ((defaults.respectReducedMotion ?? true) && prefersReducedMotion()) {
    return applyEndStateImmediately(element, props, defaults);
  }

  ensurePropertiesRegistered();

  const { groups, finalStyles, restorations, needsTransform, transformBits } = buildKeyframes(
    element,
    props,
    defaults,
  );

  if (groups.length === 0) {
    // Nothing to animate — skip transform wiring entirely.
    return noopController(element, defaults);
  }

  if (needsTransform) {
    ensureTransformWired(element);
    registerTransformAnimation(element, transformBits);
  }

  const fill = defaults.fill ?? "both";
  const composite = defaults.composite ?? "replace";
  const iterations = defaults.iterations ?? 1;
  const direction = defaults.direction ?? "normal";
  const iterationStart = defaults.iterationStart ?? 0;
  const playbackRate = defaults.playbackRate ?? 1;
  const len = groups.length;
  const animations: Animation[] = new Array(len);
  for (let i = 0; i < len; i++) {
    const g = groups[i]!;
    const t = g.timing;
    const anim = element.animate(g.keyframes as PropertyIndexedKeyframes, {
      duration: t.duration,
      delay: t.delay,
      easing: t.easing,
      fill,
      composite,
      iterations,
      direction,
      iterationStart,
    });
    if (playbackRate !== 1) anim.playbackRate = playbackRate;
    animations[i] = anim;
  }

  return createController({
    element,
    animations,
    defaults,
    finalStyles,
    restorations,
    onTeardown: needsTransform
      ? () => deregisterTransformAnimation(element, transformBits)
      : undefined,
  });
};

/**
 * When reduced motion is requested we skip animating but still apply the
 * final state so the layout matches what the caller expected.
 */
const applyEndStateImmediately = (
  element: HTMLElement | SVGElement,
  props: AnimateProps,
  defaults: AnimateDefaults,
): AnimationController => {
  const keys = Object.keys(props);
  let needsTransform = false;
  const style = element.style;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const def = resolveProp(key);
    if (def.transform) needsTransform = true;
    const config = normalizeInput(props[key]!, defaults);
    style.setProperty(def.css, formatValue(config.to, def));
  }
  if (needsTransform) {
    ensurePropertiesRegistered();
    ensureTransformWired(element);
  }
  return noopController(element, defaults);
};
