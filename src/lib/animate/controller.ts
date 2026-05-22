/**
 * Controllers wrap one-or-more WAAPI animations behind a uniform interface
 * and own the lifecycle hooks (`onStart` / `onEnd`) plus inline-style cleanup.
 */

import { isBrowser } from "./utils";
import type { AnimateDefaults, AnimationController } from "./types";

const NOOP = (): void => {};
const EMPTY_ANIMATIONS: readonly Animation[] = Object.freeze([]);

export const noopController = (
  element: Element,
  defaults: AnimateDefaults,
): AnimationController => {
  defaults.onStart?.(element);
  defaults.onEnd?.(element, { finished: true });
  return {
    animations: EMPTY_ANIMATIONS,
    finished: Promise.resolve(),
    currentTime: null,
    playbackRate: 1,
    cancel: NOOP,
    stop: NOOP,
    pause: NOOP,
    play: NOOP,
    reverse: NOOP,
    seek: NOOP,
  };
};

interface ControllerOptions {
  element: HTMLElement | SVGElement;
  animations: Animation[];
  defaults: AnimateDefaults;
  finalStyles: ReadonlyArray<{ css: string; value: string }>;
  restorations: ReadonlyArray<{ css: string; value: string }>;
  onTeardown?: () => void;
}

const applyFinalStyles = (
  element: HTMLElement | SVGElement,
  finalStyles: ReadonlyArray<{ css: string; value: string }>,
  restorations: ReadonlyArray<{ css: string; value: string }>,
): void => {
  const style = element.style;
  // Single setProperty per write — but no intermediate getComputedStyle, no
  // commitStyles(), and no allocation per entry. Style invalidations within
  // the same micro-task are coalesced by the engine.
  for (let i = 0; i < finalStyles.length; i++) {
    const w = finalStyles[i]!;
    style.setProperty(w.css, w.value);
  }
  // Replace committed pixel values with the original auto-keywords so the
  // element remains responsive to layout changes.
  for (let i = 0; i < restorations.length; i++) {
    const w = restorations[i]!;
    style.setProperty(w.css, w.value);
  }
};

export const createController = ({
  element,
  animations,
  defaults,
  finalStyles,
  restorations,
  onTeardown,
}: ControllerOptions): AnimationController => {
  defaults.onStart?.(element);

  let finalized = false;
  const finalize = (): void => {
    if (finalized) return;
    finalized = true;
    // Cancel each animation; we don't call commitStyles() because the
    // applyFinalStyles() call below writes the same end-state we'd commit
    // (and avoids an extra forced style resolution per animation).
    for (let i = 0; i < animations.length; i++) animations[i]!.cancel();
    applyFinalStyles(element, finalStyles, restorations);
    onTeardown?.();
  };

  // Build the aggregate finished promise lazily — many animations are
  // fire-and-forget, and accessing `a.finished` allocates one Promise per
  // underlying Animation which is wasted when the caller never awaits.
  let finishedPromise: Promise<void> | undefined;
  const getFinished = (): Promise<void> => {
    if (finishedPromise) return finishedPromise;
    const len = animations.length;
    if (len === 0) {
      finishedPromise = Promise.resolve();
      return finishedPromise;
    }
    const settled: Promise<unknown>[] = new Array(len);
    for (let i = 0; i < len; i++) settled[i] = animations[i]!.finished;
    finishedPromise = Promise.all(settled).then(
      () => {
        finalize();
        defaults.onEnd?.(element, { finished: true });
      },
      (err) => {
        // Don't run finalize on cancel — `cancel()` already did. Still fire
        // onEnd so callers get a consistent signal, and rethrow so awaiters
        // can observe the abort.
        defaults.onEnd?.(element, { finished: false });
        throw err;
      },
    );
    return finishedPromise;
  };

  // Eagerly subscribe so onEnd still fires for fire-and-forget callers; the
  // unhandled-rejection on cancel is suppressed by attaching a no-op .catch.
  const eager = getFinished();
  eager.catch(NOOP);

  return {
    animations,
    get finished() {
      return getFinished();
    },
    get currentTime(): number | null {
      const t = animations[0]?.currentTime;
      return typeof t === "number" ? t : null;
    },
    get playbackRate(): number {
      return animations[0]?.playbackRate ?? 1;
    },
    set playbackRate(rate: number) {
      for (let i = 0; i < animations.length; i++) animations[i]!.playbackRate = rate;
    },
    cancel: () => {
      for (let i = 0; i < animations.length; i++) animations[i]!.cancel();
      onTeardown?.();
    },
    stop: () => {
      // Read the current animated value of each property from the computed
      // style and write it as an inline style. getComputedStyle() reflects
      // the live WAAPI frame for both standard and registered CSS custom
      // properties, making this reliable where commitStyles() is not.
      if (isBrowser()) {
        const computed = window.getComputedStyle(element);
        const style = (element as HTMLElement).style;
        for (const w of finalStyles) {
          const val = computed.getPropertyValue(w.css).trim();
          if (val) style.setProperty(w.css, val);
        }
      }
      for (let i = 0; i < animations.length; i++) animations[i]!.cancel();
      onTeardown?.();
    },
    pause: () => {
      for (let i = 0; i < animations.length; i++) animations[i]!.pause();
    },
    play: () => {
      for (let i = 0; i < animations.length; i++) animations[i]!.play();
    },
    reverse: () => {
      for (let i = 0; i < animations.length; i++) animations[i]!.reverse();
    },
    seek: (timeMs: number) => {
      for (let i = 0; i < animations.length; i++) {
        try {
          animations[i]!.currentTime = timeMs;
        } catch {
          // Animation may have been cancelled — ignore.
        }
      }
    },
  };
};
