/**
 * Scroll-linked animation — bind an animation's progress to scroll position.
 *
 * Rather than depend on the still-patchy native `ScrollTimeline`, this drives
 * any paused {@link AnimationController} by seeking it: progress `0…1` maps to
 * `0…totalDuration`. That works in every browser and composes with the rest of
 * the library (springs, per-prop timing, the `--motion-*` transform chain).
 *
 * Use it as a Svelte attachment:
 *
 * @example
 * ```svelte
 * <div
 *   {@attach scroll({
 *     animation: (el) => animate(el, { opacity: [0, 1], y: [40, 0] }),
 *   })}
 * >…</div>
 * ```
 *
 * Or as a raw progress callback (e.g. a reading-progress bar):
 * ```svelte
 * <div {@attach scroll({ range: 'page', onProgress: (p) => (bar.style.scaleX = p) })} />
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '$lib/shared/browser';
import type { AnimationController, MotionElement } from '$lib/animate';
import { coverProgress, containProgress, pageProgress } from './progress';

export type ScrollAxis = 'x' | 'y';
export type ScrollRange = 'cover' | 'contain' | 'page';

export interface ScrollOptions {
	/** Scroll axis. Default `'y'`. */
	axis?: ScrollAxis;
	/**
	 * How scroll position maps to progress:
	 *  - `'cover'`   — element crossing the viewport (enter → leave). Default.
	 *  - `'contain'` — the span where the element is fully visible.
	 *  - `'page'`    — whole-scroller progress (ignores the element).
	 */
	range?: ScrollRange;
	/** Scroll container. Defaults to the window/viewport. */
	container?: Element | null;
	/** Build the (ideally paused) animation to drive. Receives the element. */
	animation?: (element: MotionElement) => AnimationController;
	/** Raw progress callback, called every scroll frame with `0…1`. */
	onProgress?: (progress: number, element: MotionElement) => void;
}

/** Total active span (delay + active duration) across a controller's animations. */
const totalDuration = (controller: AnimationController): number => {
	let max = 0;
	for (const anim of controller.animations) {
		const timing = anim.effect?.getComputedTiming();
		if (!timing) continue;
		const end = (Number(timing.delay) || 0) + (Number(timing.activeDuration) || 0);
		if (end > max) max = end;
	}
	return max;
};

interface ScrollState {
	scroll: number;
	viewport: number;
	scrollSize: number;
	elementStart: number;
	elementSize: number;
}

const readState = (
	element: MotionElement,
	container: Element | null,
	axis: ScrollAxis
): ScrollState => {
	const rect = element.getBoundingClientRect();
	if (container) {
		const cRect = container.getBoundingClientRect();
		return axis === 'y'
			? {
					scroll: container.scrollTop,
					viewport: container.clientHeight,
					scrollSize: container.scrollHeight,
					elementStart: rect.top - cRect.top + container.scrollTop,
					elementSize: rect.height
				}
			: {
					scroll: container.scrollLeft,
					viewport: container.clientWidth,
					scrollSize: container.scrollWidth,
					elementStart: rect.left - cRect.left + container.scrollLeft,
					elementSize: rect.width
				};
	}
	const doc = document.documentElement;
	return axis === 'y'
		? {
				scroll: window.scrollY,
				viewport: window.innerHeight,
				scrollSize: doc.scrollHeight,
				elementStart: rect.top + window.scrollY,
				elementSize: rect.height
			}
		: {
				scroll: window.scrollX,
				viewport: window.innerWidth,
				scrollSize: doc.scrollWidth,
				elementStart: rect.left + window.scrollX,
				elementSize: rect.width
			};
};

const progressFor = (range: ScrollRange, s: ScrollState): number => {
	switch (range) {
		case 'page':
			return pageProgress(s.scroll, s.scrollSize, s.viewport);
		case 'contain':
			return containProgress(s.elementStart, s.elementSize, s.viewport, s.scroll);
		default:
			return coverProgress(s.elementStart, s.elementSize, s.viewport, s.scroll);
	}
};

/** Create a scroll-linked attachment. */
export const scroll = (options: ScrollOptions = {}): Attachment<MotionElement> => {
	const { axis = 'y', range = 'cover', container = null, animation, onProgress } = options;

	return (element) => {
		if (!isBrowser()) return;

		const controller = animation?.(element);
		controller?.pause();
		const duration = controller ? totalDuration(controller) : 0;
		const scrollSource: EventTarget = container ?? window;

		let frame: number | null = null;
		const update = (): void => {
			frame = null;
			const progress = progressFor(range, readState(element, container, axis));
			controller?.seek(progress * duration);
			onProgress?.(progress, element);
		};
		const schedule = (): void => {
			if (frame == null) frame = requestAnimationFrame(update);
		};

		update();
		scrollSource.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule, { passive: true });

		return () => {
			if (frame != null) cancelAnimationFrame(frame);
			scrollSource.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			controller?.cancel();
		};
	};
};
