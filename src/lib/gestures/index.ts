/**
 * Pointer-gesture attachments for Svelte 5.
 *
 * - `draggable()` — momentum drag with constraints, elastic edges, snap-back.
 * - `moveable()` — pointer tracking for tilt / parallax / magnetic effects.
 * - `swipeable()` — discrete directional fling on release.
 * - `hoverable()` — hover with touch-aware filtering.
 * - `focusable()` — keyboard-focus counterpart of hover.
 * - `pressable()` — press with native cancel semantics, long-press & double-tap.
 * - `pinchable()` — two-pointer pinch-zoom + rotate.
 * - `wheelable()` — desktop wheel / trackpad zoom.
 * - `reorder()` — headless drag-to-reorder.
 *
 * All compose with `animate()` on the same element via the `--motion-*` chain.
 */

export { draggable } from './draggable';
export type { DraggableOptions, DragAxis, DragInfo } from './draggable';
export { moveable } from './move';
export type { MoveableOptions, MoveInfo } from './move';
export { swipeable } from './swipe';
export type { SwipeableOptions, SwipeAxis, SwipeDirection, SwipeInfo } from './swipe';
export { hoverable } from './hover';
export type { HoverableOptions } from './hover';
export { focusable } from './focus';
export type { FocusableOptions } from './focus';
export { pressable } from './press';
export type { PressableOptions } from './press';
export { pinchable } from './pinch';
export type { PinchableOptions, PinchInfo } from './pinch';
export { wheelable } from './wheel';
export type { WheelableOptions, WheelInfo } from './wheel';
export { reorder } from './reorder';
export type { ReorderOptions, ReorderHandle } from './reorder';
export { applyConstraint, xBounds, yBounds } from './constraints';
export type { DragConstraints, AxisBounds } from './constraints';
