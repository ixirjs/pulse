/**
 * Viewport-trigger attachment — run effects when an element enters or leaves
 * the viewport, built on `IntersectionObserver` (supported everywhere).
 *
 * This is the "play when in view" / `whileInView` primitive: pair it with
 * `animate()` to reveal content on scroll without manual observer wiring.
 *
 * @example
 * ```svelte
 * <div
 *   {@attach inView({
 *     onEnter: (el) => animate(el, { opacity: [0, 1], y: [24, 0] }),
 *     once: true,
 *   })}
 * >…</div>
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '$lib/shared/browser';
import type { MotionElement } from '$lib/animate';

export interface InViewOptions {
	/** Fired when the element crosses into view. */
	onEnter?: (element: MotionElement) => void;
	/** Fired when the element crosses out of view. */
	onLeave?: (element: MotionElement) => void;
	/** Stop observing after the first enter. Default false. */
	once?: boolean;
	/**
	 * Visibility ratio `0…1` that counts as "in view", forwarded to the
	 * observer's `threshold`. Default 0 (any pixel visible).
	 */
	amount?: number | number[];
	/** Margin around the root box (CSS `rootMargin`), e.g. `"-10% 0px"`. */
	margin?: string;
	/** Scroll root. Defaults to the viewport. */
	root?: Element | null;
}

/** Create an in-view trigger attachment. */
export const inView = (options: InViewOptions = {}): Attachment<MotionElement> => {
	const { onEnter, onLeave, once = false, amount = 0, margin, root = null } = options;

	return (element) => {
		if (!isBrowser() || typeof IntersectionObserver === 'undefined') {
			// No observer (SSR / very old engines): treat as already visible.
			onEnter?.(element);
			return;
		}

		let inside = false;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting === inside) continue;
					inside = entry.isIntersecting;
					if (inside) {
						onEnter?.(element);
						if (once) observer.disconnect();
					} else {
						onLeave?.(element);
					}
				}
			},
			{ threshold: amount, rootMargin: margin, root }
		);
		observer.observe(element);

		return () => observer.disconnect();
	};
};
