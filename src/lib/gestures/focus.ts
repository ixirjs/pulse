/**
 * `focusable()` — the keyboard counterpart of `hoverable()`. It gives symmetric
 * enter/leave callbacks for focus, so the same motion you drive on hover can be
 * driven when a user tabs to the element (or clicks into it). It uses the
 * bubbling `focusin` / `focusout` events with a `relatedTarget` containment
 * check, so it behaves like CSS `:focus-within`: start fires when focus enters
 * the subtree and end fires only once focus leaves it entirely — no flicker
 * when focus moves between children.
 *
 * @example
 * ```svelte
 * <button
 *   {@attach focusable({
 *     onFocusStart: (el) => animate(el, { scale: 1.05 }),
 *     onFocusEnd:   (el) => animate(el, { scale: 1 }),
 *   })}
 * />
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '$lib/shared/browser';
import type { MotionElement } from '$lib/animate';

export interface FocusableOptions {
	onFocusStart?: (element: MotionElement, event: FocusEvent) => void;
	onFocusEnd?: (element: MotionElement, event: FocusEvent) => void;
	/** Disable without removing the attachment. */
	disabled?: boolean;
}

/** Create a focus attachment. */
export const focusable = (options: FocusableOptions = {}): Attachment<MotionElement> => {
	const { onFocusStart, onFocusEnd, disabled = false } = options;

	return (element) => {
		if (!isBrowser() || disabled) return;

		let focused = false;

		const onFocusIn = (event: FocusEvent): void => {
			if (focused) return;
			focused = true;
			onFocusStart?.(element, event);
		};
		const onFocusOut = (event: FocusEvent): void => {
			// `relatedTarget` is the element about to receive focus; if it's still
			// inside us, focus only moved between children — stay "focused".
			const next = event.relatedTarget;
			if (next instanceof Node && element.contains(next)) return;
			if (!focused) return;
			focused = false;
			onFocusEnd?.(element, event);
		};

		const focusIn = onFocusIn as EventListener;
		const focusOut = onFocusOut as EventListener;
		element.addEventListener('focusin', focusIn);
		element.addEventListener('focusout', focusOut);

		return () => {
			element.removeEventListener('focusin', focusIn);
			element.removeEventListener('focusout', focusOut);
		};
	};
};
