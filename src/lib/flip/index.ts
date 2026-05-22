/**
 * Public entry point for the FLIP module.
 *
 * - Low-level primitives (`animateFlip`, `createFlipScope`, `createLayoutBridge`, …)
 *   are re-exported for consumers that need direct access.
 * - High-level helpers (`flip`, `snapshotRect`, `flipFrom`) live here so
 *   callers import from a single path instead of from a parallel barrel.
 */

import type { Attachment } from "svelte/attachments";
import type { AnimationController } from "$lib/animate/types";
import { animateFlip } from "./animator";
import { createFlipAttachment } from "./attachment.svelte";
import { measure } from "./geometry";
import type { FlipOptions, FlipOptionsInput, FlipRect } from "./types";

// ---------------------------------------------------------------------------
// High-level API
// ---------------------------------------------------------------------------

/**
 * FLIP attachment for Svelte 5. Each instance owns its own state.
 * For cross-component shared-element transitions use {@link createFlipScope}.
 *
 * @example
 * ```svelte
 * <div {@attach flip()}>auto-tracks layout shifts</div>
 * <div {@attach flip({ duration: 320 })}>...</div>
 * <!-- Remeasure when rune dependencies change: -->
 * <div {@attach flip({ auto: () => { void open; } })}>...</div>
 * ```
 */
export const flip = <T extends HTMLElement | SVGElement>(
  input?: FlipOptionsInput,
): Attachment<T> => createFlipAttachment(input, null);

/** Capture an element's current rect to pass to {@link flipFrom} later. */
export const snapshotRect = (element: Element): FlipRect => measure(element);

/** Animate an element from a captured rect to its current position. */
export const flipFrom = (
  element: HTMLElement | SVGElement,
  from: FlipRect,
  options: FlipOptions = {},
): AnimationController | null =>
  animateFlip({ element, from, to: measure(element), options });

/**
 * Animate an element from its current position to a captured rect.
 *
 * This is a *forward* FLIP: the DOM stays at its current position while the
 * element is driven visually toward `to` via keyframes `[0 → Δ]`. Use it for
 * collapse / exit animations where the DOM has not yet been moved (e.g. the
 * element is about to be removed). Standard inverse-FLIP (`flipFrom`) requires
 * the DOM to already be at the target position.
 */
export const flipTo = (
  element: HTMLElement | SVGElement,
  to: FlipRect,
  options: FlipOptions = {},
): AnimationController | null =>
  animateFlip({ element, from: measure(element), to, options });

// ---------------------------------------------------------------------------
// Low-level re-exports
// ---------------------------------------------------------------------------

export { createFlipSwitcher } from "./switcher.svelte";
export type { FlipSwitcher, FlipSwitchRole } from "./switcher.svelte";

export { animateFlip } from "./animator";
export { createFlipAttachment } from "./attachment.svelte";
export { createFlipScope } from "./scope";
export { createLayoutBridge } from "./bridge";
export {
  computeDelta,
  diagonal,
  isIdentityDelta,
  measure,
  rectsEqual,
} from "./geometry";
export { createLayoutObservers } from "./observers";
export { createReflowScheduler } from "./scheduler";
export {
  DEFAULT_DELAY,
  DEFAULT_DURATION,
  DEFAULT_EASING,
  readOptions,
  resolveDuration,
  resolveEasing,
  resolveOpacity,
} from "./options";

export type { FlipDelta, DeltaOptions } from "./geometry";
export type { LayoutBridgeHandle } from "./bridge";
export type { LayoutObservers, LayoutObserverArgs } from "./observers";
export type { ReflowScheduler } from "./scheduler";
export type * from "./types";
