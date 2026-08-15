/**
 * Shared DOM plumbing for the pointer-gesture attachments: capture that never
 * throws, and the `touch-action` lock every drag-like gesture needs.
 *
 * `setPointerCapture` / `releasePointerCapture` raise `NotFoundError` when the
 * pointer id is not active (common with synthetic events in tests, and with
 * pointers that ended out of order). These wrappers swallow that so gesture
 * teardown is always safe.
 */

import { restoreStyleProp, saveStyleProp } from '../shared/inline-style';
import type { MotionElement } from '../shared/types';

/** The axis a gesture owns; the browser keeps panning on the other one. */
export type GestureAxis = 'x' | 'y' | 'both';

const TOUCH_ACTION: Record<GestureAxis, string> = {
	x: 'pan-y',
	y: 'pan-x',
	both: 'none'
};

/**
 * Hand the gesture's axis to us rather than the browser's native panning, and
 * return the teardown that puts the element's own `touch-action` back.
 */
export const lockTouchAction = (element: MotionElement, axis: GestureAxis): (() => void) => {
	const saved = saveStyleProp(element.style, 'touch-action');
	element.style.setProperty('touch-action', TOUCH_ACTION[axis]);
	return () => restoreStyleProp(element.style, 'touch-action', saved);
};

export const capture = (element: Element, pointerId: number): void => {
	try {
		element.setPointerCapture(pointerId);
	} catch {
		// Pointer not active — capture is best-effort.
	}
};

export const release = (element: Element, pointerId: number): void => {
	try {
		element.releasePointerCapture(pointerId);
	} catch {
		// Already released or never captured.
	}
};
