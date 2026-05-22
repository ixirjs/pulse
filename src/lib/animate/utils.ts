import type { AnimatableValue, EasingFn } from "./types";
import { PROPERTY_REGISTRY, type PropDef } from "./properties";
import { isBrowser, prefersReducedMotion } from "$lib/shared/browser";

export { isBrowser, prefersReducedMotion };

export const DEFAULT_DURATION = 300;
/** Default easing — equivalent to CSS `ease-out` cubic-bezier. */
export const DEFAULT_EASING: EasingFn = (t) => 1 - (1 - t) ** 3;

/** Number of samples used when converting an easing fn to a `linear()` curve. */
const EASING_SAMPLES = 25;

/**
 * Convert a possibly-numeric value to its CSS string form, applying the
 * default unit from the property registry when the value is purely numeric.
 */
export const formatValue = (
  value: AnimatableValue,
  def: PropDef,
): string => {
  if (typeof value === "number") {
    return def.unit ? `${value}${def.unit}` : `${value}`;
  }
  return value;
};

/**
 * Resolve the property definition for a given key. Unknown keys fall back to
 * a passthrough definition treating the key as a kebab-cased CSS property.
 */
/** Cache passthrough PropDefs for unknown keys to avoid repeat regex/string work. */
const UNKNOWN_PROP_CACHE: Record<string, PropDef> = Object.create(null) as Record<string, PropDef>;

export const resolveProp = (key: string): PropDef => {
  const known = PROPERTY_REGISTRY[key];
  if (known) return known;
  const cached = UNKNOWN_PROP_CACHE[key];
  if (cached) return cached;
  // Convert camelCase → kebab-case for unknown CSS properties.
  const css = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  const def: PropDef = { css, unit: "", initial: "" };
  UNKNOWN_PROP_CACHE[key] = def;
  return def;
};

// Matches a value that WAAPI can interpolate (a number followed by a CSS unit
// or a bare number). Values that fail this check (keywords like "none", "auto")
// cannot be used as keyframe endpoints and must be resolved another way.
const ANIMATABLE_VALUE_RE = /^-?\d*\.?\d+(px|%|em|rem|vh|vw|vmin|vmax|deg|rad|turn|s|ms|fr)?$/;

/**
 * Read the current "from" value for a property — used when the caller
 * supplies only a target value. Pass a hoisted `CSSStyleDeclaration` to
 * avoid re-allocating one per prop.
 *
 * For properties with `sizeDimension`, if `getComputedStyle` returns a
 * non-animatable keyword (e.g. `max-width: none`, `min-height: auto`),
 * the corresponding axis of `getBoundingClientRect()` is used instead — that
 * value is always animatable and reflects the element's current rendered size.
 */
export const readCurrentValue = (
  element: HTMLElement | SVGElement,
  def: PropDef,
  computed?: CSSStyleDeclaration,
): string => {
  if (!isBrowser()) return def.initial;
  const style = computed ?? window.getComputedStyle(element);
  const raw = style.getPropertyValue(def.css).trim();
  if (!raw) return def.initial;
  if (def.sizeDimension && !ANIMATABLE_VALUE_RE.test(raw)) {
    // Computed value is a keyword (e.g. "none") — fall back to the rendered
    // bounding box so WAAPI always gets an animatable px value as `from`.
    const rect = element.getBoundingClientRect();
    return `${def.sizeDimension === "width" ? rect.width : rect.height}px`;
  }
  return raw;
};

/**
 * Convert an easing function into a WAAPI-compatible `linear(...)` easing
 * string by sampling the curve at evenly-spaced points. Memoized by easing
 * reference — animations are typically issued with shared easing functions,
 * so the second-and-onwards sampling cost is eliminated.
 */
const EASING_CACHE = new WeakMap<EasingFn, string>();

const sampleEasing = (fn: EasingFn): string => {
  const last = EASING_SAMPLES - 1;
  const points = new Array<string>(EASING_SAMPLES);
  for (let i = 0; i < EASING_SAMPLES; i++) points[i] = fn(i / last).toFixed(5);
  return `linear(${points.join(", ")})`;
};

export const easingToCss = (easing: EasingFn | undefined): string => {
  const fn = easing ?? DEFAULT_EASING;
  // SpringEasingFn carries a pre-built linear() string at full simulation
  // fidelity — use it directly to avoid the lossy 25-point resample.
  const springLinear = (fn as { _linearEasing?: string })._linearEasing;
  if (springLinear) return springLinear;
  const cached = EASING_CACHE.get(fn);
  if (cached) return cached;
  const css = sampleEasing(fn);
  EASING_CACHE.set(fn, css);
  return css;
};

/** Precomputed `linear(...)` string for the library default easing. */
export const DEFAULT_EASING_CSS: string = easingToCss(DEFAULT_EASING);

/**
 * Build a `linear(...)` easing string from explicit normalized samples.
 */
export const samplesToLinearEasing = (samples: readonly number[]): string =>
  `linear(${samples.map((s) => s.toFixed(5)).join(", ")})`;

// ---------------------------------------------------------------------------
// Intrinsic-size keyword measurement
// ---------------------------------------------------------------------------

const AUTO_KEYWORDS = new Set([
  "auto",
  "fit-content",
  "min-content",
  "max-content",
  "intrinsic",
  // Sizing keywords with varying browser/spec support.
  "stretch",
  "available",
  "-webkit-fill-available",
  "-moz-available",
]);

/** Returns true when `value` is an intrinsic-size keyword like `auto`. */
export const isAutoKeyword = (value: AnimatableValue | undefined): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim().toLowerCase();
  return AUTO_KEYWORDS.has(v) || v.startsWith("fit-content(");
};

/**
 * Temporarily apply `keyword` to `def.css`, force layout, then read back the
 * resolved pixel value so it can be used as a concrete keyframe endpoint.
 * The element's prior inline value is restored before returning.
 *
 * Two measurement strategies:
 * 1. `width` / `height` — `getBoundingClientRect()` always resolves to px.
 * 2. Properties with `sizeDimension` (e.g. `max-width`, `min-height`) — try
 *    `getComputedStyle` first; if it echoes the keyword (browsers preserve
 *    `min-content` etc. as the computed value), fall back to the bounding rect.
 * 3. All others — `getComputedStyle` only, no bounding-rect fallback.
 */
export const measureKeywordValue = (
  element: HTMLElement | SVGElement,
  def: PropDef,
  keyword: string,
): string => {
  if (!isBrowser()) return def.initial;
  const style = (element as HTMLElement).style;
  const saved = style.getPropertyValue(def.css);
  const savedPriority = style.getPropertyPriority(def.css);

  style.setProperty(def.css, keyword);

  let measured: string;
  if (def.css === "width" || def.css === "height") {
    const rect = element.getBoundingClientRect();
    measured = `${def.css === "width" ? rect.width : rect.height}px`;
  } else {
    const computed = window.getComputedStyle(element).getPropertyValue(def.css).trim();
    if (computed && computed !== keyword) {
      // getComputedStyle resolved the keyword to a concrete value — use it.
      // Avoids a second getBoundingClientRect() forced layout in the common case.
      measured = computed;
    } else if (def.sizeDimension) {
      // Browser preserved the keyword in computed style (common for max-width,
      // min-height, etc.). Fall back to the axis-appropriate bounding dimension.
      const rect = element.getBoundingClientRect();
      measured = `${def.sizeDimension === "width" ? rect.width : rect.height}px`;
    } else {
      measured = "0px";
    }
  }

  if (saved) style.setProperty(def.css, saved, savedPriority);
  else style.removeProperty(def.css);

  return measured;
};
