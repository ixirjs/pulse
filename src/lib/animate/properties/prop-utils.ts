/**
 * Property name resolution and CSS value helpers for the `animate()` runtime.
 *
 * Resolves shorthand prop names (`x`, `scaleX`, …) to their CSS equivalents,
 * converts JS values to CSS strings, and reads live computed values from the DOM.
 */

import type { AnimatableValue, MotionElement } from "../types";
import { PROPERTY_REGISTRY, type PropDef } from "./properties";
import { isBrowser } from "$lib/shared/browser";

/**
 * Convert a possibly-numeric value to its CSS string form, applying the
 * default unit from the property registry when the value is purely numeric.
 */
export const formatValue = (value: AnimatableValue, def: PropDef): string =>
  typeof value === "number" ? `${value}${def.unit}` : value;

/** Cache passthrough PropDefs for unknown keys to avoid repeat regex/string work. */
const UNKNOWN_PROP_CACHE: Record<string, PropDef> = Object.create(null) as Record<string, PropDef>;

/**
 * Resolve the property definition for a given key. Unknown keys fall back to
 * a passthrough definition treating the key as a kebab-cased CSS property.
 */
export const resolveProp = (key: string): PropDef => {
  const known = PROPERTY_REGISTRY[key];
  if (known) return known;
  const cached = UNKNOWN_PROP_CACHE[key];
  if (cached) return cached;
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
 * the corresponding axis of `getBoundingClientRect()` is used instead.
 */
export const readCurrentValue = (
  element: MotionElement,
  def: PropDef,
  computed?: CSSStyleDeclaration,
): string => {
  if (!isBrowser()) return def.initial;
  const style = computed ?? window.getComputedStyle(element);
  const raw = style.getPropertyValue(def.css).trim();
  if (!raw) return def.initial;
  if (def.sizeDimension && !ANIMATABLE_VALUE_RE.test(raw)) {
    return `${element.getBoundingClientRect()[def.sizeDimension]}px`;
  }
  return raw;
};
