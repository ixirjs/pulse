/**
 * `reorder()` — drag-to-reorder a list, composing pointer dragging with the
 * library's FLIP engine. The dragged item follows the pointer while its
 * siblings slide to make room; on drop the underlying array is reordered via a
 * callback and every item FLIPs from its pre-drop position into its new slot,
 * so the settle is seamless regardless of when the framework commits the DOM.
 *
 * It is headless: it never owns your data. You pass a reactive `items()` thunk
 * and an `onReorder(next)` callback, and attach `r.item(value)` to each row.
 *
 * @example
 * ```svelte
 * <script>
 *   let list = $state(['a', 'b', 'c']);
 *   const r = reorder({ items: () => list, onReorder: (next) => (list = next) });
 * </script>
 *
 * {#each list as value (value)}
 *   <div {@attach r.item(value)}>{value}</div>
 * {/each}
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '$lib/shared/browser';
import { snapshotRect, flipFrom } from '$lib/flip';
import type { EasingFn } from '$lib/shared/types';
import { capture, release } from './pointer-capture';

export interface ReorderOptions<T> {
	/** Reactive thunk returning the current ordered list. */
	items: () => T[];
	/** Called with the new order when a drag drops on a different slot. */
	onReorder: (next: T[]) => void;
	/** Drag axis. Default `'y'`. */
	axis?: 'x' | 'y';
	/** Disable dragging without detaching. */
	disabled?: boolean;
	/** Settle animation length in ms (the FLIP into the new slot). Default 220. */
	duration?: number;
	/** Settle easing. */
	easing?: EasingFn;
}

export interface ReorderHandle<T> {
	/** Attachment for one row, identified by its data value. */
	item: (value: T) => Attachment<HTMLElement>;
}

/** Move `arr[from]` to index `to`, returning a new array. */
const arrayMove = <T>(arr: readonly T[], from: number, to: number): T[] => {
	const next = arr.slice();
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved!);
	return next;
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

interface DragState {
	pointerId: number;
	el: HTMLElement;
	from: number;
	over: number;
	stride: number;
	start: number;
	els: HTMLElement[];
	centers: number[];
}

/** Create a reorder controller for one list. */
export const reorder = <T>(options: ReorderOptions<T>): ReorderHandle<T> => {
	const { axis = 'y', duration = 220 } = options;
	const horizontal = axis === 'x';
	const elements = new Map<T, HTMLElement>();

	const coordOf = (e: PointerEvent): number => (horizontal ? e.clientX : e.clientY);
	const centerOf = (r: DOMRect): number =>
		horizontal ? r.left + r.width / 2 : r.top + r.height / 2;
	const translate = (px: number): string =>
		horizontal ? `translateX(${px}px)` : `translateY(${px}px)`;

	let drag: DragState | null = null;

	/** Slide siblings between `from` and `over` to open the drop slot. */
	const layoutSiblings = (): void => {
		if (!drag) return;
		const { els, from, over, stride } = drag;
		for (let i = 0; i < els.length; i++) {
			if (i === drag.from) continue;
			let shift = 0;
			if (from < over && i > from && i <= over) shift = -stride;
			else if (over < from && i >= over && i < from) shift = stride;
			els[i]!.style.transform = shift ? translate(shift) : '';
		}
	};

	const onMove = (e: PointerEvent): void => {
		if (!drag || e.pointerId !== drag.pointerId) return;
		const delta = coordOf(e) - drag.start;
		drag.el.style.transform = translate(delta);
		const over = clamp(drag.from + Math.round(delta / drag.stride), 0, drag.els.length - 1);
		if (over !== drag.over) {
			drag.over = over;
			layoutSiblings();
		}
	};

	const endDrag = (e: PointerEvent): void => {
		if (!drag || e.pointerId !== drag.pointerId) return;
		const { el, els, from, over, pointerId } = drag;
		el.removeEventListener('pointermove', onMove as EventListener);
		el.removeEventListener('pointerup', endDrag as EventListener);
		el.removeEventListener('pointercancel', endDrag as EventListener);
		release(el, pointerId);
		drag = null;

		// Capture every row's current (transformed) position, drop the inline
		// transforms, commit the reorder, then FLIP each row from where it
		// visually was into its freshly-laid-out slot.
		const fromRects = els.map((node) => snapshotRect(node));
		for (const node of els) {
			node.style.transform = '';
			node.style.transition = '';
		}
		el.style.zIndex = '';
		el.style.position = '';

		if (over !== from) options.onReorder(arrayMove(options.items(), from, over));

		requestAnimationFrame(() => {
			for (let i = 0; i < els.length; i++) {
				flipFrom(els[i]!, fromRects[i]!, { duration, easing: options.easing });
			}
		});
	};

	const onDown =
		(el: HTMLElement) =>
		(e: PointerEvent): void => {
			if (options.disabled || e.button !== 0 || drag) return;
			const order = options.items();
			const els = order.map((v) => elements.get(v)).filter((n): n is HTMLElement => !!n);
			const from = els.indexOf(el);
			if (from < 0) return;

			const rects = els.map((node) => node.getBoundingClientRect());
			const centers = rects.map(centerOf);
			const stride =
				els.length > 1
					? (centers[centers.length - 1]! - centers[0]!) / (els.length - 1)
					: horizontal
						? rects[0]!.width
						: rects[0]!.height;

			drag = {
				pointerId: e.pointerId,
				el,
				from,
				over: from,
				stride,
				start: coordOf(e),
				els,
				centers
			};

			// Lift the dragged row; give siblings a transition so they glide.
			el.style.position = 'relative';
			el.style.zIndex = '1';
			for (let i = 0; i < els.length; i++) {
				if (i !== from) els[i]!.style.transition = `transform ${duration}ms`;
			}

			capture(el, e.pointerId);
			el.addEventListener('pointermove', onMove as EventListener);
			el.addEventListener('pointerup', endDrag as EventListener);
			el.addEventListener('pointercancel', endDrag as EventListener);
		};

	const item =
		(value: T): Attachment<HTMLElement> =>
		(el) => {
			if (!isBrowser()) return;
			elements.set(value, el);
			el.style.touchAction = horizontal ? 'pan-y' : 'pan-x';
			const down = onDown(el);
			el.addEventListener('pointerdown', down as EventListener);
			return () => {
				el.removeEventListener('pointerdown', down as EventListener);
				elements.delete(value);
			};
		};

	return { item };
};
