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

import { animate } from "./animate";
import type {
  AnimateDefaults,
  AnimateProps,
  AnimationController,
  PropConfig,
  PropInput,
} from "./types";
import { normalizeInput, resolveTiming } from "./normalize";
import { isBrowser } from "./utils";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Where to place a timeline entry. See file header for grammar.
 *
 * `undefined` means "append after the current end" — the most common case.
 */
export type TimelinePosition = number | string | undefined;

export interface TimelineDefaults extends AnimateDefaults {
  /**
   * If `true`, the timeline is built but not started until `play()` is called.
   * If `false` (default), playback begins automatically on the next microtask
   * after the first definition — matching `animate()`'s fire-and-forget feel.
   */
  paused?: boolean;
}

export interface Timeline {
  /**
   * Add an `animate()` call at a position. `options` overrides the timeline
   * defaults; per-prop options inside `props` still override `options`.
   */
  add(
    element: HTMLElement | SVGElement,
    props: AnimateProps,
    options?: AnimateDefaults,
    position?: TimelinePosition,
  ): Timeline;

  /**
   * Apply CSS values immediately at the given position — useful for "reset"
   * frames between sequenced animations (e.g. `set(el, { opacity: 0 })`
   * before fading in).
   */
  set(
    element: HTMLElement | SVGElement,
    props: AnimateProps,
    position?: TimelinePosition,
  ): Timeline;

  /** Fire a callback at the given position. */
  call(callback: () => void, position?: TimelinePosition): Timeline;

  /** Declare a named position for later reference. */
  label(name: string, position?: TimelinePosition): Timeline;

  /** Total duration in ms (max end across all entries). */
  readonly duration: number;

  /** All underlying WAAPI animations once materialized. */
  readonly animations: readonly Animation[];

  /** Resolves when every materialized animation finishes (or rejects on cancel). */
  readonly finished: Promise<void>;

  /** Currently-known labels. Mostly useful for debugging / introspection. */
  readonly labels: ReadonlyMap<string, number>;

  play(): Timeline;
  pause(): Timeline;
  reverse(): Timeline;
  cancel(): void;

  /**
   * Commit each element's current in-flight animated values as inline styles,
   * then cancel — the timeline equivalent of `AnimationController.stop()`.
   * Useful for interrupting mid-flight and starting a new animation from the
   * actual current position.
   */
  stop(): void;

  /** Seek every materialized animation to `timeMs` from the timeline start. */
  seek(timeMs: number): Timeline;

  /**
   * Set the playback rate of every underlying animation.
   * Values `> 1` speed up, `< 1` slow down, negative values reverse.
   * If called before materialization the rate is applied on play.
   */
  setPlaybackRate(rate: number): Timeline;
}

// ---------------------------------------------------------------------------
// Internal entry shapes
// ---------------------------------------------------------------------------

interface AnimateEntry {
  readonly kind: "animate";
  start: number;
  end: number;
  element: HTMLElement | SVGElement;
  props: AnimateProps;
  options: AnimateDefaults;
}

interface SetEntry {
  readonly kind: "set";
  start: number;
  end: number;
  element: HTMLElement | SVGElement;
  props: AnimateProps;
}

interface CallEntry {
  readonly kind: "call";
  start: number;
  end: number;
  callback: () => void;
}

type Entry = AnimateEntry | SetEntry | CallEntry;

// ---------------------------------------------------------------------------
// Position resolution
// ---------------------------------------------------------------------------

interface Anchor {
  /** Current end of the timeline (max entry end). */
  duration: number;
  /** Start of the most recent entry — anchor for `"<"`. */
  lastStart: number;
  /** End of the most recent entry — anchor for `">"`. */
  lastEnd: number;
  /** Named labels. */
  labels: Map<string, number>;
}

/**
 * Parse a trailing `+=N` / `-=N` / `+N` / `-N` offset off `expr`, returning
 * `[base, offset]`. If no offset, `offset === 0`.
 */
const splitOffset = (expr: string): [string, number] => {
  const m = expr.match(/^(.*?)(?:\s*([+-]=?)\s*(\d+(?:\.\d+)?))?$/);
  if (!m || !m[2]) return [expr.trim(), 0];
  const sign = m[2].startsWith("-") ? -1 : 1;
  return [m[1]!.trim(), sign * Number(m[3])];
};

const resolvePosition = (
  position: TimelinePosition,
  anchor: Anchor,
): number => {
  if (position == null) return anchor.duration;
  if (typeof position === "number") return Math.max(0, position);

  const trimmed = position.trim();
  if (trimmed === "") return anchor.duration;

  // Pure relative: "+=N" / "-=N".
  if (trimmed.startsWith("+=") || trimmed.startsWith("-=")) {
    const sign = trimmed[0] === "-" ? -1 : 1;
    const offset = sign * Number(trimmed.slice(2));
    return Math.max(0, anchor.duration + offset);
  }

  const [base, offset] = splitOffset(trimmed);

  if (base === "" || base === ">") {
    return Math.max(0, anchor.lastEnd + offset);
  }
  if (base === "<") {
    return Math.max(0, anchor.lastStart + offset);
  }

  const labelTime = anchor.labels.get(base);
  if (labelTime === undefined) {
    throw new Error(`[timeline] Unknown label or position: "${position}"`);
  }
  return Math.max(0, labelTime + offset);
};

// ---------------------------------------------------------------------------
// Duration estimation for an `add()` entry
// ---------------------------------------------------------------------------

/**
 * Compute the total time an `animate()` call will occupy — the largest
 * `(delay + duration)` across its props. Spring durations are auto-sized
 * via the same `resolveTiming()` the runtime uses, so the value is exact.
 */
const computeAnimateDuration = (
  element: HTMLElement | SVGElement,
  props: AnimateProps,
  defaults: AnimateDefaults,
): number => {
  let max = 0;
  for (const key in props) {
    const config = normalizeInput(props[key]!, defaults);
    const t = resolveTiming(config, element);
    const total = t.duration + t.delay;
    if (total > max) max = total;
  }
  return max;
};

// ---------------------------------------------------------------------------
// Offset injection for materialization
// ---------------------------------------------------------------------------

const isPropConfigObject = (input: PropInput): input is PropConfig =>
  typeof input === "object" &&
  input !== null &&
  !Array.isArray(input) &&
  "to" in (input as PropConfig);

/**
 * Wrap each prop input into a `PropConfig` whose `delay` includes the
 * timeline offset. We don't push the offset onto `defaults.delay` because
 * per-prop `delay` would override it — losing the offset for any prop with
 * its own delay value.
 */
const offsetProps = (
  props: AnimateProps,
  defaults: AnimateDefaults,
  offset: number,
): AnimateProps => {
  if (offset === 0) return props;
  const out: Record<string, PropInput> = {};
  for (const key in props) {
    const raw = props[key]!;
    if (Array.isArray(raw)) {
      out[key] = {
        from: raw[0],
        to: raw[1],
        delay: (defaults.delay ?? 0) + offset,
      };
    } else if (isPropConfigObject(raw)) {
      out[key] = { ...raw, delay: (raw.delay ?? defaults.delay ?? 0) + offset };
    } else {
      out[key] = {
        to: raw as PropConfig["to"],
        delay: (defaults.delay ?? 0) + offset,
      };
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Timeline factory
// ---------------------------------------------------------------------------

const NOOP = (): void => {};

export const timeline = (defaults: TimelineDefaults = {}): Timeline => {
  const { paused = false, ...animateDefaults } = defaults;
  const entries: Entry[] = [];
  const labels = new Map<string, number>();
  const anchor: Anchor = { duration: 0, lastStart: 0, lastEnd: 0, labels };

  // Materialization state.
  let materialized = false;
  let controllers: AnimationController[] = [];
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

  const materialize = (): void => {
    if (materialized) return;
    materialized = true;
    if (!isBrowser()) return;

    const allAnims: Animation[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      if (entry.kind === "animate") {
        const ctrl = animate(
          entry.element,
          offsetProps(entry.props, entry.options, entry.start),
          entry.options,
        );
        controllers.push(ctrl);
        for (let j = 0; j < ctrl.animations.length; j++) {
          allAnims.push(ctrl.animations[j]!);
        }
      } else if (entry.kind === "set") {
        // Schedule at start time; if start === 0 fire synchronously to match
        // `animate()`'s reduced-motion fast-path semantics.
        if (entry.start <= 0) {
          applySetEntry(entry);
        } else {
          timeoutHandles.push(
            setTimeout(() => applySetEntry(entry), entry.start),
          );
        }
      } else {
        if (entry.start <= 0) {
          try { entry.callback(); } catch (e) { reportError(e); }
        } else {
          timeoutHandles.push(
            setTimeout(() => {
              try { entry.callback(); } catch (e) { reportError(e); }
            }, entry.start),
          );
        }
      }
    }

    cachedAnimations = allAnims;

    if (pendingPlaybackRate !== undefined) {
      const rate = pendingPlaybackRate;
      for (let i = 0; i < allAnims.length; i++) allAnims[i]!.playbackRate = rate;
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

  const add: Timeline["add"] = (element, props, options, position) => {
    ensureNotMaterialized("add");
    const merged = options ? { ...animateDefaults, ...options } : animateDefaults;
    const start = resolvePosition(position, anchor);
    const length = computeAnimateDuration(element, props, merged);
    const entry: AnimateEntry = {
      kind: "animate",
      start,
      end: start + length,
      element,
      props,
      options: merged,
    };
    entries.push(entry);
    updateAnchor(entry);
    scheduleAutoPlay();
    return api;
  };

  const setEntry: Timeline["set"] = (element, props, position) => {
    ensureNotMaterialized("set");
    const start = resolvePosition(position, anchor);
    const entry: SetEntry = {
      kind: "set",
      start,
      end: start,
      element,
      props,
    };
    entries.push(entry);
    updateAnchor(entry);
    scheduleAutoPlay();
    return api;
  };

  const call: Timeline["call"] = (callback, position) => {
    ensureNotMaterialized("call");
    const start = resolvePosition(position, anchor);
    const entry: CallEntry = { kind: "call", start, end: start, callback };
    entries.push(entry);
    updateAnchor(entry);
    scheduleAutoPlay();
    return api;
  };

  const label: Timeline["label"] = (name, position) => {
    ensureNotMaterialized("label");
    const time = resolvePosition(position, anchor);
    labels.set(name, time);
    return api;
  };

  // -------------------------------------------------------------------------
  // Playback controls
  // -------------------------------------------------------------------------

  const play: Timeline["play"] = () => {
    if (cancelled) return api;
    if (!materialized) {
      materialize();
    } else {
      for (let i = 0; i < controllers.length; i++) controllers[i]!.play();
    }
    return api;
  };

  const pause: Timeline["pause"] = () => {
    // Materialize-then-pause keeps the API symmetric: paused timelines can
    // still be inspected for duration/animations.
    if (!materialized) materialize();
    for (let i = 0; i < controllers.length; i++) controllers[i]!.pause();
    return api;
  };

  const reverse: Timeline["reverse"] = () => {
    if (!materialized) materialize();
    for (let i = 0; i < controllers.length; i++) controllers[i]!.reverse();
    return api;
  };

  const cancel: Timeline["cancel"] = () => {
    cancelled = true;
    for (let i = 0; i < controllers.length; i++) controllers[i]!.cancel();
    for (let i = 0; i < timeoutHandles.length; i++) clearTimeout(timeoutHandles[i]!);
    timeoutHandles = [];
  };

  const stop: Timeline["stop"] = () => {
    cancelled = true;
    for (let i = 0; i < controllers.length; i++) controllers[i]!.stop();
    for (let i = 0; i < timeoutHandles.length; i++) clearTimeout(timeoutHandles[i]!);
    timeoutHandles = [];
  };

  const seek: Timeline["seek"] = (timeMs) => {
    if (!materialized) materialize();
    const anims = cachedAnimations ?? [];
    for (let i = 0; i < anims.length; i++) {
      try {
        anims[i]!.currentTime = timeMs;
      } catch {
        // Animation may have been cancelled — ignore.
      }
    }
    return api;
  };

  // Pre-materialization rate is stored and applied to each animation on materialize.
  let pendingPlaybackRate: number | undefined;

  const setPlaybackRate: Timeline["setPlaybackRate"] = (rate) => {
    if (materialized) {
      for (let i = 0; i < controllers.length; i++) controllers[i]!.playbackRate = rate;
    } else {
      pendingPlaybackRate = rate;
    }
    return api;
  };

  // -------------------------------------------------------------------------
  // Aggregate `finished`
  // -------------------------------------------------------------------------

  const buildFinished = (): Promise<void> => {
    if (!materialized) materialize();
    if (controllers.length === 0) return Promise.resolve();
    const settled: Promise<unknown>[] = new Array(controllers.length);
    for (let i = 0; i < controllers.length; i++) {
      settled[i] = controllers[i]!.finished;
    }
    return Promise.all(settled).then(NOOP);
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
      if (!materialized) materialize();
      return cachedAnimations ?? [];
    },
    get finished() {
      if (!finishedPromise) finishedPromise = buildFinished();
      return finishedPromise;
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
