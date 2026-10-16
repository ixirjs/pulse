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

export { draggable } from './draggable.js';
export type { DraggableOptions, DragAxis, DragInfo } from './draggable.js';
export { moveable } from './move.js';
export type { MoveableOptions, MoveInfo } from './move.js';
export { swipeable } from './swipe.js';
export type { SwipeableOptions, SwipeAxis, SwipeDirection, SwipeInfo } from './swipe.js';
export { hoverable } from './hover.js';
export type { HoverableOptions } from './hover.js';
export { focusable } from './focus.js';
export type { FocusableOptions } from './focus.js';
export { pressable } from './press.js';
export type { PressableOptions } from './press.js';
export { pinchable } from './pinch.js';
export type { PinchableOptions, PinchInfo } from './pinch.js';
export { wheelable } from './wheel.js';
export type { WheelableOptions, WheelInfo } from './wheel.js';
export { reorder } from './reorder.js';
export type { ReorderOptions, ReorderHandle } from './reorder.js';
export { applyConstraint, xBounds, yBounds } from './constraints.js';
export type { DragConstraints, AxisBounds } from './constraints.js';
