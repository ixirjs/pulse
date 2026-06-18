/**
 * `timeline()` — sequence and parallelize `animate()` calls along a shared clock.
 *
 * Mental model:
 *  - The timeline has a running cursor and an internal duration.
 *  - Every entry (`add` / `set` / `call` / `label`) is placed at a position
 *    that may be absolute (number ms), relative (`"+=200"`), anchored to the
 *    last entry (`"<"` / `">"` with optional offset), or a named label.
 *  - Animations are materialized lazily on `play()` (or any access to
 *    `finished` / `animations`). Until then, the timeline is just a plan and
 *    can be mutated freely.
 *  - Once materialized, child WAAPI animations carry the timeline offset in
 *    their per-prop `delay`, so `pause()` / `play()` / `reverse()` /
 *    `cancel()` propagate cleanly to all of them.
 *
 * Position grammar:
 *   `undefined`                → append at current end (same as `">"`).
 *   `123`                      → absolute time in ms.
 *   `"+=200"`, `"-=100"`       → offset from current end.
 *   `">"`, `">+200"`, `">-50"` → end of last child (with optional offset).
 *   `"<"`, `"<+200"`, `"<-50"` → start of last child (with optional offset).
 *   `"label"`, `"label+=200"`  → at a previously declared label.
 *
 * @example
 * ```ts
 * timeline({ duration: 400, easing: easeOut })
 *   .add(card,    { y: [20, 0], opacity: [0, 1] })
 *   .add(title,   { y: [10, 0], opacity: [0, 1] }, undefined, '<+50')
 *   .label('reveal')
 *   .add(actions, { opacity: [0, 1] }, undefined, 'reveal+=100')
 *   .call(() => emit('opened'), '>+100')
 *   .play();
 * ```
 */

import { animate } from "../core/animate";
import type { AnimationController } from "../types";
import { type Anchor, resolvePosition } from "./timeline-position";
import {
  type Entry,
  type SetEntry,
  computeAnimateDuration,
  offsetProps,
} from "./timeline-internals";
import { isBrowser } from "$lib/shared/browser";
import type { Timeline, TimelineDefaults, TimelinePosition } from "./timeline-types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type { Timeline, TimelineDefaults, TimelinePosition };

// ---------------------------------------------------------------------------
// Timeline factory
// ---------------------------------------------------------------------------


export const timeline = (defaults: TimelineDefaults = {}): Timeline => {
  const { paused = false, ...animateDefaults } = defaults;
  const entries: Entry[] = [];
  const labels = new Map<string, number>();
  const anchor: Anchor = { duration: 0, lastStart: 0, lastEnd: 0, labels };

  // Materialization state.
  let materialized = false;
  const controllers: AnimationController[] = [];
  let timeoutHandles: ReturnType<typeof setTimeout>[] = [];
  let cachedAnimations: readonly Animation[] | undefined;
  let cancelled = false;

  // Aggregate finished promise, lazily built (mirrors `controller.ts` style).
  let finishedPromise: Promise<void> | undefined;

  const updateAnchor = (entry: Entry): void => {
    anchor.lastStart = entry.start;
    anchor.lastEnd = entry.end;
    if (entry.end > anchor.duration) anchor.duration = entry.end;
  };

  const ensureNotMaterialized = (op: string): void => {
    if (materialized) {
      throw new Error(
        `[timeline] Cannot call .${op}() after the timeline has started. ` +
          `Build the full timeline before play()/finished/animations.`,
      );
    }
  };

  // -------------------------------------------------------------------------
  // Materialization
  // -------------------------------------------------------------------------

  // Fire synchronously when startMs <= 0 (matches animate()'s reduced-motion
  // fast-path), otherwise schedule via setTimeout and track the handle.
  const scheduleAt = (startMs: number, fn: () => void): void => {
    if (startMs <= 0) fn();
    else timeoutHandles.push(setTimeout(fn, startMs));
  };

  const materialize = (): void => {
    if (materialized) return;
    materialized = true;
    if (!isBrowser()) return;

    for (const entry of entries) {
      if (entry.kind === "animate") {
        controllers.push(animate(
          entry.element,
          offsetProps(entry.props, entry.options, entry.start),
          entry.options,
        ));
      } else if (entry.kind === "set") {
        scheduleAt(entry.start, () => applySetEntry(entry));
      } else {
        scheduleAt(entry.start, () => {
          try { entry.callback(); } catch (e) { reportError(e); }
        });
      }
    }

    cachedAnimations = controllers.flatMap(c => c.animations);

    // Apply any pre-materialization rate through the same controller setter the
    // live setPlaybackRate() uses, so playback-rate changes have one code path.
    if (pendingPlaybackRate !== undefined) {
      const rate = pendingPlaybackRate;
      forEachCtrl(c => (c.playbackRate = rate));
    }
  };

  const applySetEntry = (entry: SetEntry): void => {
    // Use a 0-duration `animate()` call so transform wiring + property
    // registration go through the same pipeline as a normal animation.
    animate(entry.element, entry.props, { duration: 0, fill: "forwards" });
  };

  const reportError = (err: unknown): void => {
    // Match the WAAPI behaviour: callback errors should not break the timeline.
    queueMicrotask(() => {
      throw err;
    });
  };

  // -------------------------------------------------------------------------
  // Auto-play scheduling
  // -------------------------------------------------------------------------

  // We defer auto-play to a microtask so the caller can finish chaining
  // `.add(...).add(...)` synchronously before anything starts.
  let autoPlayScheduled = false;
  const scheduleAutoPlay = (): void => {
    if (paused || autoPlayScheduled || materialized || !isBrowser()) return;
    autoPlayScheduled = true;
    queueMicrotask(() => {
      if (!materialized && !cancelled) materialize();
    });
  };

  // -------------------------------------------------------------------------
  // Builder methods
  // -------------------------------------------------------------------------

  const pushEntry = (entry: Entry): Timeline => {
    entries.push(entry);
    updateAnchor(entry);
    scheduleAutoPlay();
    return api;
  };

  // Guard against post-materialization mutation, then resolve the entry's
  // start time. Shared opening step of every builder method.
  const resolveStart = (op: string, position: TimelinePosition): number => {
    ensureNotMaterialized(op);
    return resolvePosition(position, anchor);
  };

  const add: Timeline["add"] = (element, props, options, position) => {
    const start = resolveStart("add", position);
    const merged = options ? { ...animateDefaults, ...options } : animateDefaults;
    const length = computeAnimateDuration(element, props, merged);
    return pushEntry({ kind: "animate", start, end: start + length, element, props, options: merged });
  };

  const setEntry: Timeline["set"] = (element, props, position) => {
    const start = resolveStart("set", position);
    return pushEntry({ kind: "set", start, end: start, element, props });
  };

  const call: Timeline["call"] = (callback, position) => {
    const start = resolveStart("call", position);
    return pushEntry({ kind: "call", start, end: start, callback });
  };

  const label: Timeline["label"] = (name, position) => {
    labels.set(name, resolveStart("label", position));
    return api;
  };

  // -------------------------------------------------------------------------
  // Playback controls
  // -------------------------------------------------------------------------

  const forEachCtrl = (fn: (c: AnimationController) => void): void => {
    for (const ctrl of controllers) fn(ctrl);
  };

  // Materialize the timeline (so paused/seeked timelines stay inspectable for
  // duration/animations), apply `op` to every controller, then return the
  // chainable api. Shared by pause/reverse/seek.
  const materializeThen = (op: (c: AnimationController) => void): Timeline => {
    materialize();
    forEachCtrl(op);
    return api;
  };

  const play: Timeline["play"] = () => {
    if (cancelled) return api;
    if (!materialized) {
      materialize();
    } else {
      forEachCtrl(c => c.play());
    }
    return api;
  };

  const pause: Timeline["pause"] = () => materializeThen(c => c.pause());

  const reverse: Timeline["reverse"] = () => materializeThen(c => c.reverse());

  const clearTimeouts = (): void => {
    for (const h of timeoutHandles) clearTimeout(h);
    timeoutHandles = [];
  };

  const shutdown = (op: (c: AnimationController) => void): void => {
    cancelled = true;
    forEachCtrl(op);
    clearTimeouts();
  };

  const cancel: Timeline["cancel"] = () => shutdown(c => c.cancel());
  const stop: Timeline["stop"] = () => shutdown(c => c.stop());

  const seek: Timeline["seek"] = (timeMs) => materializeThen(c => c.seek(timeMs));

  // Pre-materialization rate is stored and applied to each animation on materialize.
  let pendingPlaybackRate: number | undefined;

  const setPlaybackRate: Timeline["setPlaybackRate"] = (rate) => {
    if (materialized) {
      forEachCtrl(c => (c.playbackRate = rate));
    } else {
      pendingPlaybackRate = rate;
    }
    return api;
  };

  // -------------------------------------------------------------------------
  // Aggregate `finished`
  // -------------------------------------------------------------------------

  const buildFinished = (): Promise<void> => {
    materialize();
    if (controllers.length === 0) return Promise.resolve();
    return Promise.all(controllers.map(c => c.finished)).then(() => {});
  };

  const api: Timeline = {
    add,
    set: setEntry,
    call,
    label,
    get duration() {
      return anchor.duration;
    },
    get animations() {
      materialize();
      return cachedAnimations ?? [];
    },
    get finished() {
      return (finishedPromise ??= buildFinished());
    },
    get labels() {
      return labels;
    },
    play,
    pause,
    reverse,
    cancel,
    stop,
    seek,
    setPlaybackRate,
  };

  return api;
};
