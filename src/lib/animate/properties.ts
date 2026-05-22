/**
 * Maps high-level animation prop names (`x`, `scale`, `opacity`, …) to the
 * underlying CSS property they drive plus a default unit/initial value.
 *
 * Transform-related props animate registered CSS custom properties so each
 * axis can have its own duration / easing / spring without conflicting with
 * sibling animations on the same element.
 */

export interface PropDef {
  /** CSS property name to animate (may be a custom property). */
  css: string;
  /** Default unit appended when a numeric value is supplied. */
  unit: string;
  /** Initial / "rest" value. */
  initial: string;
  /** CSS @property syntax descriptor. Enables smooth interpolation for vars. */
  syntax?: string;
  /** Whether this prop is a transform component driving the composed style. */
  transform?: boolean;
  /**
   * Whether the prop accepts intrinsic-size keywords (`auto`, `fit-content`,
   * `min-content`, `max-content`). When true, `animate()` will measure the
   * keyword's resolved pixel value and restore the keyword inline once the
   * animation finishes so the element stays responsive.
   */
  measurable?: boolean;
  /**
   * For dimension-like properties whose CSS computed value may still be a
   * keyword (e.g. `max-width: none`, `min-height: auto`), this indicates
   * which axis of `getBoundingClientRect()` to fall back to when
   * `getComputedStyle` echoes the keyword rather than resolving it to px.
   */
  sizeDimension?: "width" | "height";
}

/* eslint-disable @typescript-eslint/naming-convention */
export const PROPERTY_REGISTRY: Readonly<Record<string, PropDef>> = {
  // Transform components — animated through CSS variables.
  x:        { css: "--motion-x",        unit: "px",  initial: "0px",  syntax: "<length-percentage>", transform: true },
  y:        { css: "--motion-y",        unit: "px",  initial: "0px",  syntax: "<length-percentage>", transform: true },
  z:        { css: "--motion-z",        unit: "px",  initial: "0px",  syntax: "<length>",            transform: true },
  scale:    { css: "--motion-scale",    unit: "",    initial: "1",    syntax: "<number>",            transform: true },
  scaleX:   { css: "--motion-scale-x",  unit: "",    initial: "1",    syntax: "<number>",            transform: true },
  scaleY:   { css: "--motion-scale-y",  unit: "",    initial: "1",    syntax: "<number>",            transform: true },
  rotate:   { css: "--motion-rotate",   unit: "deg", initial: "0deg", syntax: "<angle>",             transform: true },
  // FLIP-exclusive offset vars — compose with x/y so FLIP transitions never
  // clobber sibling position animations that share --motion-x / --motion-y.
  flipX:      { css: "--flip-x",        unit: "px", initial: "0px", syntax: "<length>", transform: true },
  flipY:      { css: "--flip-y",        unit: "px", initial: "0px", syntax: "<length>", transform: true },
  // FLIP-exclusive scale vars — compose with scaleX/scaleY so FLIP scale
  // never clobbers sibling scale animations that share --motion-scale-x/y.
  flipScaleX: { css: "--flip-scale-x",  unit: "",   initial: "1",   syntax: "<number>", transform: true },
  flipScaleY: { css: "--flip-scale-y",  unit: "",   initial: "1",   syntax: "<number>", transform: true },

  // Common CSS shorthands with sensible default units.
  opacity:  { css: "opacity",  unit: "", initial: "1" },
  width:    { css: "width",    unit: "px", initial: "auto", measurable: true },
  height:   { css: "height",   unit: "px", initial: "auto", measurable: true },
  top:      { css: "top",      unit: "px", initial: "auto", measurable: true },
  left:     { css: "left",     unit: "px", initial: "auto", measurable: true },
  right:    { css: "right",    unit: "px", initial: "auto", measurable: true },
  bottom:   { css: "bottom",   unit: "px", initial: "auto", measurable: true },
  margin:       { css: "margin",        unit: "px", initial: "0" },
  marginTop:    { css: "margin-top",    unit: "px", initial: "0", measurable: true },
  marginRight:  { css: "margin-right",  unit: "px", initial: "0", measurable: true },
  marginBottom: { css: "margin-bottom", unit: "px", initial: "0", measurable: true },
  marginLeft:   { css: "margin-left",   unit: "px", initial: "0", measurable: true },
  padding:      { css: "padding",       unit: "px", initial: "0" },
  paddingTop:    { css: "padding-top",    unit: "px", initial: "0" },
  paddingRight:  { css: "padding-right",  unit: "px", initial: "0" },
  paddingBottom: { css: "padding-bottom", unit: "px", initial: "0" },
  paddingLeft:   { css: "padding-left",   unit: "px", initial: "0" },
  // Sizing constraints — sizeDimension lets measurement fall back to the
  // bounding rect when getComputedStyle echoes the keyword (e.g. "none").
  maxWidth:  { css: "max-width",  unit: "px", initial: "none", measurable: true, sizeDimension: "width"  },
  maxHeight: { css: "max-height", unit: "px", initial: "none", measurable: true, sizeDimension: "height" },
  minWidth:  { css: "min-width",  unit: "px", initial: "0",    measurable: true, sizeDimension: "width"  },
  minHeight: { css: "min-height", unit: "px", initial: "0",    measurable: true, sizeDimension: "height" },
  // Typography
  fontSize:     { css: "font-size",     unit: "px", initial: "16px" },
  lineHeight:   { css: "line-height",   unit: "",   initial: "normal" },
  letterSpacing: { css: "letter-spacing", unit: "px", initial: "0px" },
  wordSpacing:  { css: "word-spacing",  unit: "px", initial: "0px" },
  // Borders & outline
  borderRadius:    { css: "border-radius",   unit: "px", initial: "0" },
  borderWidth:     { css: "border-width",    unit: "px", initial: "0" },
  outlineWidth:    { css: "outline-width",   unit: "px", initial: "0" },
  outlineOffset:   { css: "outline-offset",  unit: "px", initial: "0" },
  // Layout
  gap:       { css: "gap",        unit: "px", initial: "0" },
  columnGap: { css: "column-gap", unit: "px", initial: "0" },
  rowGap:    { css: "row-gap",    unit: "px", initial: "0" },
  // Flex
  flexGrow:   { css: "flex-grow",   unit: "", initial: "0" },
  flexShrink: { css: "flex-shrink", unit: "", initial: "1" },
  // Stacking & visibility
  zIndex:      { css: "z-index",   unit: "", initial: "auto" },
  // Colors
  color:           { css: "color",            unit: "", initial: "currentColor" },
  backgroundColor: { css: "background-color", unit: "", initial: "transparent" },
  borderColor:     { css: "border-color",     unit: "", initial: "transparent" },
  outlineColor:    { css: "outline-color",    unit: "", initial: "currentColor" },
  // Filters (pass full CSS string, e.g. 'blur(4px)')
  filter:        { css: "filter",         unit: "", initial: "none" },
  backdropFilter: { css: "backdrop-filter", unit: "", initial: "none" },
  // SVG
  strokeDashoffset: { css: "stroke-dashoffset", unit: "", initial: "0" },
  strokeWidth:      { css: "stroke-width",      unit: "px", initial: "1" },
  strokeOpacity:    { css: "stroke-opacity",    unit: "", initial: "1" },
  fillOpacity:      { css: "fill-opacity",      unit: "", initial: "1" },
};
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Composed CSS expressions for the individual `translate`, `scale`, `rotate`
 * properties so that each transform component reads its own custom var.
 */
export const TRANSFORM_TEMPLATES = {
  translate:
    "calc(var(--motion-x, 0px) + var(--flip-x, 0px)) " +
    "calc(var(--motion-y, 0px) + var(--flip-y, 0px)) " +
    "var(--motion-z, 0px)",
  scale:
    "calc(var(--flip-scale-x, 1) * var(--motion-scale-x, 1) * var(--motion-scale, 1)) " +
    "calc(var(--flip-scale-y, 1) * var(--motion-scale-y, 1) * var(--motion-scale, 1))",
  rotate: "var(--motion-rotate, 0deg)",
} as const;

let registered = false;

/**
 * Register motion CSS custom properties via `CSS.registerProperty` so that
 * the browser can interpolate them smoothly. Safe to call repeatedly; no-op
 * if the API is unavailable (older Firefox, SSR, etc.).
 */
export const ensurePropertiesRegistered = (): void => {
  if (registered) return;
  registered = true;
  if (typeof CSS === "undefined" || typeof CSS.registerProperty !== "function") {
    return;
  }
  for (const def of Object.values(PROPERTY_REGISTRY)) {
    if (!def.transform || !def.syntax) continue;
    try {
      CSS.registerProperty({
        name: def.css,
        syntax: def.syntax,
        inherits: false,
        initialValue: def.initial,
      });
    } catch {
      // Already registered or unsupported syntax — ignore.
    }
  }
};

const ELEMENTS_WITH_TRANSFORM = new WeakSet<Element>();

/**
 * Make sure the element's `translate` / `scale` / `rotate` styles are wired
 * to read the motion CSS variables. Idempotent per element.
 */
export const ensureTransformWired = (
  element: HTMLElement | SVGElement,
): void => {
  if (ELEMENTS_WITH_TRANSFORM.has(element)) return;
  ELEMENTS_WITH_TRANSFORM.add(element);
  const style = (element as HTMLElement).style;
  if (!style) return;
  if (!style.translate) style.translate = TRANSFORM_TEMPLATES.translate;
  if (!style.scale) style.scale = TRANSFORM_TEMPLATES.scale;
  if (!style.rotate) style.rotate = TRANSFORM_TEMPLATES.rotate;
};

// ---------------------------------------------------------------------------
// Transform animation registry + ancestor-aware rect measurement
// ---------------------------------------------------------------------------

/**
 * Identity values for every motion CSS custom property that drives a
 * transform. Used to suppress ancestor transforms during measurement.
 */
const MOTION_TRANSFORM_IDENTITIES: ReadonlyArray<readonly [string, string]> = [
  ["--motion-x",        "0px"],
  ["--motion-y",        "0px"],
  ["--motion-z",        "0px"],
  ["--motion-scale",    "1"],
  ["--motion-scale-x",  "1"],
  ["--motion-scale-y",  "1"],
  ["--motion-rotate",   "0deg"],
  ["--flip-x",          "0px"],
  ["--flip-y",          "0px"],
  ["--flip-scale-x",    "1"],
  ["--flip-scale-y",    "1"],
];

const N_TRANSFORM_VARS = MOTION_TRANSFORM_IDENTITIES.length;

/**
 * Bit position for each transform CSS var — derived from MOTION_TRANSFORM_IDENTITIES
 * so the index alignment is guaranteed consistent.
 */
export const VAR_BIT: Readonly<Record<string, number>> = Object.fromEntries(
  MOTION_TRANSFORM_IDENTITIES.map(([name], i) => [name, 1 << i]),
);

/**
 * Per-element ref-count for each transform CSS var currently in-flight.
 * The 9-slot Uint8Array maps directly to MOTION_TRANSFORM_IDENTITIES indices.
 * Entry is removed when all slots reach zero so suppressNode bails early.
 */
const activeTransformCounts = new WeakMap<Element, Uint8Array>();

/** Mark that an element has started a WAAPI transform animation. */
export const registerTransformAnimation = (element: Element, bits: number): void => {
  let counts = activeTransformCounts.get(element);
  if (!counts) {
    counts = new Uint8Array(N_TRANSFORM_VARS);
    activeTransformCounts.set(element, counts);
  }
  for (let b = bits, i = 0; b !== 0; b >>>= 1, i++) {
    if (b & 1) counts[i]++;
  }
};

/** Mark that a WAAPI transform animation on an element has ended or was cancelled. */
export const deregisterTransformAnimation = (element: Element, bits: number): void => {
  const counts = activeTransformCounts.get(element);
  if (!counts) return;
  for (let b = bits, i = 0; b !== 0; b >>>= 1, i++) {
    if ((b & 1) && counts[i] > 0) counts[i]--;
  }
  for (let i = 0; i < N_TRANSFORM_VARS; i++) {
    if (counts[i]) return;
  }
  activeTransformCounts.delete(element);
};

/**
 * Like `element.getBoundingClientRect()` but walks up the ancestor chain
 * and temporarily _suppresses_ the motion CSS vars on every ancestor that
 * currently has a running `animate()` transform animation.
 *
 * Setting the vars with `!important` beats the WAAPI animation layer in the
 * CSS cascade order, so `getBoundingClientRect()` returns the element's
 * "at rest" position even if a parent is mid-scale/translate animation.
 * All inline style changes are fully restored before the function returns —
 * no repaint ever sees the intermediate state.
 */
export const measureWithoutAncestorTransforms = (el: Element): DOMRect => {
  type Saved = {
    node: HTMLElement | SVGElement;
    props: Array<{ name: string; value: string; priority: string }>;
  };
  const suppressed: Saved[] = [];

  const suppressNode = (target: HTMLElement | SVGElement): void => {
    const counts = activeTransformCounts.get(target);
    if (!counts) return;
    const props: Array<{ name: string; value: string; priority: string }> = [];
    for (let i = 0; i < N_TRANSFORM_VARS; i++) {
      if (!counts[i]) continue;
      const [name, identity] = MOTION_TRANSFORM_IDENTITIES[i]!;
      const value = target.style.getPropertyValue(name);
      const priority = target.style.getPropertyPriority(name);
      target.style.setProperty(name, identity, "important");
      props.push({ name, value, priority });
    }
    if (props.length > 0) suppressed.push({ node: target, props });
  };

  // Suppress the element's own transform vars first so getBoundingClientRect()
  // returns the resting layout position even when the element is mid-animation
  // (e.g. during the backward-fill phase of a delayed FLIP animation).
  if (el instanceof HTMLElement || el instanceof SVGElement) suppressNode(el);

  let node: Element | null = el.parentElement;
  while (node) {
    if (node instanceof HTMLElement || node instanceof SVGElement) suppressNode(node);
    node = node.parentElement;
  }

  const rect = el.getBoundingClientRect();

  // Restore every ancestor we temporarily patched.
  for (const { node, props } of suppressed) {
    for (const { name, value, priority } of props) {
      node.style.removeProperty(name);
      if (value) node.style.setProperty(name, value, priority);
    }
  }

  return rect;
};
