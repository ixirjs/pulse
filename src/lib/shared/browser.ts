export const isBrowser = (): boolean =>
  typeof window !== "undefined" && typeof document !== "undefined";

let reducedMotionQuery: MediaQueryList | null | undefined;

export const prefersReducedMotion = (): boolean => {
  if (reducedMotionQuery === undefined) {
    reducedMotionQuery =
      isBrowser() && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
  }
  return reducedMotionQuery?.matches ?? false;
};

/**
 * Measure an element's bounding rect, temporarily suppressing any CSS
 * transitions/animations so the measurement reflects the element's true
 * layout position rather than its in-flight animated position.
 */
export function measureRectWithoutMotion(el: Element): DOMRect {
  const style = (el as HTMLElement).style;
  const prev = style.transition;
  style.transition = "none";
  const rect = el.getBoundingClientRect();
  style.transition = prev;
  return rect;
}

/**
 * Compute the transform that makes `source` visually match `target`'s
 * position and dimensions using the source corner nearest to the target.
 */
export function matchRect(source: Element, target: Element) {
  const s = measureRectWithoutMotion(source);
  const t = target.getBoundingClientRect();

  const sourceCenterX = s.left + s.width / 2;
  const sourceCenterY = s.top + s.height / 2;
  const targetCenterX = t.left + t.width / 2;
  const targetCenterY = t.top + t.height / 2;

  const originX = sourceCenterX >= targetCenterX ? "left" : "right";
  const originY = sourceCenterY >= targetCenterY ? "top" : "bottom";

  const sourceX = originX === "left" ? s.left : s.right;
  const sourceY = originY === "top" ? s.top : s.bottom;
  const targetX = originX === "left" ? t.left : t.right;
  const targetY = originY === "top" ? t.top : t.bottom;

  return {
    width: t.width,
    height: t.height,
    scaleX: t.width / s.width,
    scaleY: t.height / s.height,
    translateX: targetX - sourceX,
    translateY: targetY - sourceY,
    transformOrigin: `${originX} ${originY}`,
  };
}
