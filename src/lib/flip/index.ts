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
import { animateFlip } from "./animation/animator";
import { createFlipAttachment } from "./integration/attachment.svelte";
import { measure } from "./geometry";
import type { FlipOptions, FlipOptionsInput, FlipRect, MotionElement } from "./types";

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
export const flip = <T extends MotionElement>(
  input?: FlipOptionsInput,
): Attachment<T> => createFlipAttachment(input, null);

/** Capture an element's current rect to pass to {@link flipFrom} later. */
export const snapshotRect = measure;

/** Animate an element from a captured rect to its current position. */
export const flipFrom = (
  element: MotionElement,
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
  element: MotionElement,
  to: FlipRect,
  options: FlipOptions = {},
): AnimationController | null =>
  animateFlip({ element, from: measure(element), to, options, forward: true });

// ---------------------------------------------------------------------------
// Low-level re-exports
// ---------------------------------------------------------------------------

export { createFlipSwitcher } from "./integration/switcher.svelte";
export type { FlipSwitcher, FlipSwitchRole } from "./integration/switcher.svelte";

export { animateFlip } from "./animation/animator";
export { createFlipAttachment } from "./integration/attachment.svelte";
export { createFlipScope } from "./integration/scope";
export { createLayoutBridge } from "./integration/bridge";
export {
  computeDelta,
  diagonal,
  isIdentityDelta,
  measure,
  rectsEqual,
} from "./geometry";
export { createObserverManager } from "./tracking/observer-manager";
export type { ObserverManager } from "./tracking/observer-manager";
export { createReflowScheduler } from "./tracking/scheduler";

export type { FlipDelta, DeltaOptions } from "./geometry";
export type { LayoutBridgeHandle } from "./integration/bridge";
export type { ReflowScheduler } from "./tracking/scheduler";
export type * from "./types";
