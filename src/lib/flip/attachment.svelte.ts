/**
 * Svelte 5 attachment that wires the FLIP animator to lifecycle events,
 * layout observers, and the optional shared-layout bridge.
 *
 * This file is intentionally orchestration-only — every side-effecting
 * primitive lives in its own focused module so the pieces can be tested
 * independently.
 */

import { untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import type { AnimationController } from "$lib/animate/types";
import { isBrowser } from "$lib/shared/browser";
import { animateFlip } from "./animator";
import { measure, rectsEqual } from "./geometry";
import type { ObserverManager } from "./observer-manager";
import { readOptions } from "./options";
import { createReflowScheduler } from "./scheduler";
import type {
  FlipAuto,
  FlipOptions,
  FlipOptionsInput,
  FlipRect,
  LayoutBridge,
} from "./types";

const cancelController = (controller: AnimationController | null): void => {
  if (!controller) return;
  try {
    controller.cancel();
  } catch {
    /* noop — animation may already be torn down */
  }
};

/**
 * Core FLIP attachment factory. Shared between the standalone `flip()`
 * export and scoped instances created by `createFlipScope`.
 */
export const createFlipAttachment = (
  input: FlipOptionsInput,
  bridge: LayoutBridge | null,
): Attachment<HTMLElement | SVGElement> => {
  return (element) => {
    if (!isBrowser()) return;

    let options: FlipOptions = untrack(() => readOptions(input));
    let auto: FlipAuto | undefined = options.auto;
    let layoutId = options.layoutId;
    let prevRect: FlipRect | null =
      layoutId && bridge ? bridge.readLayout(layoutId) : null;
    let currentController: AnimationController | null = null;
    let renderCount = 0;

    // -----------------------------------------------------------------
    // Animation runner — interrupts any in-flight controller.
    // -----------------------------------------------------------------
    const run = (from: FlipRect, to: FlipRect): void => {
      const snapshot = options;
      cancelController(currentController);
      currentController = animateFlip({
        element,
        from,
        to,
        options: {
          ...snapshot,
          onEnd: (el, info) => {
            if (info.finished) currentController = null;
            snapshot.onEnd?.(el, info);
          },
        },
      });
    };

    // -----------------------------------------------------------------
    // Reflow detection — re-measure and run if the element moved.
    // -----------------------------------------------------------------
    const reflow = (): void => {
      if (!prevRect) return;
      const next = measure(element);
      const render = renderCount++;
      const { skip } = options;
      const shouldSkip =
        typeof skip === "function"
          ? skip(render, { from: prevRect, to: next })
          : (skip ?? false);
      if (shouldSkip || rectsEqual(prevRect, next)) {
        prevRect = next;
        return;
      }
      const from = prevRect;
      prevRect = next;
      run(from, next);
    };

    const scheduler = createReflowScheduler(reflow);
    let connectedManager: ObserverManager | null = null;

    const syncObservers = (): void => {
      connectedManager?.disconnect();
      connectedManager = null;
      if (typeof auto === "object") {
        auto.connect(element, scheduler.schedule);
        connectedManager = auto;
      }
    };

    // -----------------------------------------------------------------
    // Track option changes (when caller passes a thunk).
    // -----------------------------------------------------------------
    let autoEffectVersion = $state(0);

    const applyOptions = (next: FlipOptions): void => {
      const nextAuto = next.auto;
      const nextLayoutId = next.layoutId;
      const autoChanged = nextAuto !== auto;

      options = next;

      if (nextLayoutId !== layoutId) {
        layoutId = nextLayoutId;
        const restored = layoutId && bridge ? bridge.readLayout(layoutId) : null;
        prevRect = restored ?? measure(element);
      }

      if (autoChanged) {
        auto = nextAuto;
        // Use untrack so the read of autoEffectVersion is not registered as a
        // dependency of the enclosing $effect. Without this, `+= 1` would both
        // read *and* write the signal inside the same effect, causing Svelte to
        // immediately re-schedule the effect and loop until depth is exceeded.
        autoEffectVersion = untrack(() => autoEffectVersion) + 1;
        syncObservers();
      }
    };

    // -----------------------------------------------------------------
    // Initial enter animation (when restored from a shared-layout entry).
    // -----------------------------------------------------------------
    const initialRect = measure(element);
    if (prevRect) run(prevRect, initialRect);
    prevRect = initialRect;
    syncObservers();

    if (typeof input === "function") {
      $effect(() => {
        applyOptions(input() ?? {});
        scheduler.schedule();
      });
    }

    // Re-run the user's auto thunk whenever its tracked dependencies change.
    $effect(() => {
      void autoEffectVersion;
      const trigger = options.auto;
      if (typeof trigger !== "function") return;
      trigger();
      scheduler.schedule();
    });

    // -----------------------------------------------------------------
    // Teardown — cancel scheduler/observers and write layout for handoff.
    // -----------------------------------------------------------------
    return () => {
      scheduler.cancel();
      connectedManager?.disconnect();
      if (layoutId && bridge && prevRect) bridge.writeLayout(layoutId, prevRect);
      cancelController(currentController);
      currentController = null;
    };
  };
};
