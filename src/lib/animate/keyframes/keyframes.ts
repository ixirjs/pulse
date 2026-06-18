/**
 * Resolve the `from` / `to` endpoints for each prop and group them by their
 * effective timing so we issue a single WAAPI animation per timing bucket.
 */

import { VAR_BIT, type PropDef } from "../properties/properties";
import type { AnimatableValue, AnimateDefaults, AnimateProps, MotionElement } from "../types";
import { normalizeInput, resolveTiming } from "./normalize";
import { isBrowser } from "$lib/shared/browser";
import { isAutoKeyword, measureKeywordValue } from "./keyword";
import {
  formatValue,
  readCurrentValue,
  resolveProp,
} from "../properties/prop-utils";

export interface KeyframeGroup {
  timing: { duration: number; easing: string; delay: number };
  keyframes: Record<string, [string, string]>;
}

export interface CssWrite {
  css: string;
  value: string;
}

interface BuiltKeyframes {
  groups: KeyframeGroup[];
  /** Inline styles to write once the animation finishes. */
  finalStyles: CssWrite[];
  /**
   * Inline styles to re-apply *after* `finalStyles` so the element stays
   * responsive — e.g. restore `width: auto` after animating to a measured px.
   */
  restorations: CssWrite[];
  /** True if any prop drives a transform component. */
  needsTransform: boolean;
  /** Bitmask of the transform CSS vars being animated (indices match MOTION_TRANSFORM_IDENTITIES). */
  transformBits: number;
}

const resolveFrom = (
  element: MotionElement,
  def: PropDef,
  raw: AnimatableValue | undefined,
  computed: CSSStyleDeclaration | undefined,
): string => {
  if (raw == null) return readCurrentValue(element, def, computed);
  if (def.measurable && isAutoKeyword(raw)) return measureKeywordValue(element, def, raw);
  if (typeof raw === "number") return formatValue(raw, def);
  return raw;
};

/** Linear search over groups (typically 1-3 entries). Avoids hashing the
 *  potentially huge `linear(...)` easing string used in the previous Map key. */
const findGroup = (
  groups: KeyframeGroup[],
  timing: KeyframeGroup["timing"],
): KeyframeGroup | undefined => {
  for (const group of groups) {
    const t = group.timing;
    if (t.duration === timing.duration && t.delay === timing.delay && t.easing === timing.easing) {
      return group;
    }
  }
};

export const buildKeyframes = (
  element: MotionElement,
  props: AnimateProps,
  defaults: AnimateDefaults,
): BuiltKeyframes => {
  const groups: KeyframeGroup[] = [];
  const finalStyles: CssWrite[] = [];
  const restorations: CssWrite[] = [];
  let needsTransform = false;
  let transformBits = 0;

  // Lazily cache one `getComputedStyle()` per call — many props share it for
  // their `from` reads. Skipped entirely when every prop has an explicit `from`.
  let computed: CSSStyleDeclaration | undefined;
  const getComputed = (): CSSStyleDeclaration | undefined => {
    if (!isBrowser()) return undefined;
    return (computed ??= window.getComputedStyle(element));
  };

  for (const key of Object.keys(props)) {
    const def = resolveProp(key);
    if (def.transform) {
      needsTransform = true;
      transformBits |= VAR_BIT[def.css] ?? 0;
    }

    const config = normalizeInput(props[key]!, defaults);
    const { from, to } = config;
    const timing = resolveTiming(config, element);

    const fromStr = resolveFrom(element, def, from, from == null ? getComputed() : undefined);

    let toStr: string;
    if (def.measurable && isAutoKeyword(to)) {
      toStr = measureKeywordValue(element, def, to);
      restorations.push({ css: def.css, value: to });
    } else {
      toStr = formatValue(to, def);
    }
    finalStyles.push({ css: def.css, value: toStr });

    let group = findGroup(groups, timing);
    if (!group) {
      group = { timing, keyframes: {} };
      groups.push(group);
    }
    group.keyframes[def.css] = [fromStr, toStr];
  }

  return { groups, finalStyles, restorations, needsTransform, transformBits };
};
