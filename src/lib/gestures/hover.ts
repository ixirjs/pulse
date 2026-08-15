/**
 * `hoverable()` — pointer hover attachment that (unlike CSS `:hover`) ignores
 * touch "sticky hover" and gives you symmetric enter/leave callbacks to drive
 * `animate()` from.
 *
 * @example
 * ```svelte
 * <button
 *   {@attach hoverable({
 *     onHoverStart: (el) => animate(el, { scale: 1.05 }),
 *     onHoverEnd:   (el) => animate(el, { scale: 1 }),
 *   })}
 * />
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '../shared/browser';
import { listen } from '../shared/listen';
import type { MotionElement } from '../animate';

export interface HoverableOptions {
	onHoverStart?: (element: MotionElement, event: PointerEvent) => void;
	onHoverEnd?: (element: MotionElement, event: PointerEvent) => void;
	/** Also react to touch pointers. Default false (mouse/pen only). */
	includeTouch?: boolean;
}

/** Create a hover attachment. */
export const hoverable = (options: HoverableOptions = {}): Attachment<MotionElement> => {
	const { onHoverStart, onHoverEnd, includeTouch = false } = options;

	return (element) => {
		if (!isBrowser()) return;

		const ignore = (event: PointerEvent): boolean => !includeTouch && event.pointerType === 'touch';

		const onEnter = (event: PointerEvent): void => {
			if (!ignore(event)) onHoverStart?.(element, event);
		};
		const onLeave = (event: PointerEvent): void => {
			if (!ignore(event)) onHoverEnd?.(element, event);
		};

		return listen(element, { pointerenter: onEnter, pointerleave: onLeave });
	};
};
