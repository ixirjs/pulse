/**
 * Resolve the `from` / `to` endpoints for each prop and group them by their
 * effective timing so we issue a single WAAPI animation per timing bucket.
 */

import { VAR_BIT, type PropDef } from "./properties";
import type { AnimateDefaults, AnimateProps } from "./types";
import { normalizeInput, resolveTiming, type ResolvedTiming } from "./normalize";
import {
  formatValue,
  isAutoKeyword,
  isBrowser,
  measureKeywordValue,
  readCurrentValue,
  resolveProp,
} from "./utils";

export interface KeyframeGroup {
  timing: ResolvedTiming;
  keyframes: Record<string, [string, string]>;
}

export interface CssWrite {
  css: string;
  value: string;
}

export interface BuiltKeyframes {
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
  element: HTMLElement | SVGElement,
  def: PropDef,
  raw: unknown,
  computed: CSSStyleDeclaration | undefined,
): string => {
  if (raw == null) return readCurrentValue(element, def, computed);
  if (def.measurable && isAutoKeyword(raw as string)) {
    return measureKeywordValue(element, def, raw as string);
  }
  if (typeof raw === "number") return formatValue(raw, def);
  return raw as string;
};

/** Linear search over groups (typically 1-3 entries). Avoids hashing the
 *  potentially huge `linear(...)` easing string used in the previous Map key. */
const findGroup = (
  groups: KeyframeGroup[],
  timing: ResolvedTiming,
): KeyframeGroup | undefined => {
  for (let i = 0; i < groups.length; i++) {
    const t = groups[i]!.timing;
    if (
      t.duration === timing.duration &&
      t.delay === timing.delay &&
      t.easing === timing.easing
    ) {
      return groups[i];
    }
  }
  return undefined;
};

export const buildKeyframes = (
  element: HTMLElement | SVGElement,
  props: AnimateProps,
  defaults: AnimateDefaults,
): BuiltKeyframes => {
  const keys = Object.keys(props);
  const groups: KeyframeGroup[] = [];
  const finalStyles: CssWrite[] = [];
  const restorations: CssWrite[] = [];
  let needsTransform = false;
  let transformBits = 0;

  // Lazily cache one `getComputedStyle()` per call — many props share it for
  // their `from` reads. Skipped entirely when every prop has an explicit `from`.
  let computed: CSSStyleDeclaration | undefined;
  const getComputed = (): CSSStyleDeclaration | undefined => {
    if (computed) return computed;
    if (!isBrowser()) return undefined;
    computed = window.getComputedStyle(element);
    return computed;
  };

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const def = resolveProp(key);
    if (def.transform) {
      needsTransform = true;
      transformBits |= VAR_BIT[def.css] ?? 0;
    }

    const config = normalizeInput(props[key]!, defaults);
    const timing = resolveTiming(config, element);

    const fromStr = resolveFrom(
      element,
      def,
      config.from,
      config.from == null ? getComputed() : undefined,
    );

    let toStr: string;
    if (def.measurable && isAutoKeyword(config.to)) {
      toStr = measureKeywordValue(element, def, config.to as string);
      restorations.push({ css: def.css, value: config.to as string });
    } else {
      toStr = formatValue(config.to, def);
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
