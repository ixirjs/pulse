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
 * 	let list = $state(['a', 'b', 'c']);
 * 	const r = reorder({ items: () => list, onReorder: (next) => (list = next) });
 * </script>
 *
 * {#each list as value (value)}
 * 	<div {@attach r.item(value)}>{value}</div>
 * {/each}
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '../shared/browser';
import { listen } from '../shared/listen';
import { snapshotRect, flipFrom } from '../flip';
import type { EasingFn } from '../shared/types';
import { wireTransform } from '../animate/properties/transform-setup';
import { restoreStyleProp, saveStyleProp, type SavedStyleProp } from '../shared/inline-style';
import { capture, lockTouchAction, release } from './pointer-capture';

/** Find the nearest slot center to `target`. Linear — reorder lists are short. */
export const nearestCenterIndex = (centers: readonly number[], target: number): number => {
	if (centers.length === 0) return -1;
	let nearest = 0;
	for (let i = 1; i < centers.length; i++) {
		if (Math.abs(centers[i]! - target) < Math.abs(centers[nearest]! - target)) nearest = i;
	}
	return nearest;
};

export interface ReorderOptions<T> {
	/** Reactive thunk returning the current ordered list. */
	items: () => T[];
	/** Called with the new order when a drag drops on a different slot. */
	onReorder: (next: T[]) => void;
	/**
	 * Returns the stable, unique identity for each row. Required when item values
	 * are duplicated or recreated; defaults to the value itself.
	 */
	getKey?: (item: T) => unknown;
	/** Drag axis. Default `'y'`. */
	axis?: 'x' | 'y';
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

const REORDER_X = '--motion-reorder-x';
const REORDER_Y = '--motion-reorder-y';
const DRAG_STYLE_PROPERTIES = [REORDER_X, REORDER_Y, 'transition', 'position', 'z-index'] as const;
type DragStyleProperty = (typeof DRAG_STYLE_PROPERTIES)[number];
type DragStyleSnapshot = Record<DragStyleProperty, SavedStyleProp>;

const snapshotDragStyles = (element: HTMLElement): DragStyleSnapshot =>
	Object.fromEntries(
		DRAG_STYLE_PROPERTIES.map((property) => [property, saveStyleProp(element.style, property)])
	) as DragStyleSnapshot;

const restoreDragStyles = (element: HTMLElement, snapshot: DragStyleSnapshot): void => {
	for (const property of DRAG_STYLE_PROPERTIES) {
		restoreStyleProp(element.style, property, snapshot[property]);
	}
};

const setReorderOffset = (element: HTMLElement, horizontal: boolean, offset: number): void => {
	element.style.setProperty(horizontal ? REORDER_X : REORDER_Y, `${offset}px`);
};

interface DragState {
	pointerId: number;
	el: HTMLElement;
	from: number;
	over: number;
	centers: number[];
	start: number;
	els: HTMLElement[];
	styles: Map<HTMLElement, DragStyleSnapshot>;
	/** Detaches the move/up/cancel listeners this drag installed. */
	unlisten: () => void;
}

/** Create a reorder controller for one list. */
export const reorder = <T>(options: ReorderOptions<T>): ReorderHandle<T> => {
	const { axis = 'y', duration = 220 } = options;
	const horizontal = axis === 'x';
	const keyOf = options.getKey ?? ((value: T): unknown => value);
	const elements = new Map<unknown, HTMLElement>();

	const coordOf = (e: PointerEvent): number => (horizontal ? e.clientX : e.clientY);
	const centerOf = (r: DOMRect): number =>
		horizontal ? r.left + r.width / 2 : r.top + r.height / 2;

	let drag: DragState | null = null;
	// The data callback commits synchronously, but the framework needs one frame
	// to render that order before FLIP can measure it. Keep that deferred handoff
	// owned by this attachment so teardown cannot animate a detached node.
	let settleFrame: number | null = null;

	const cancelPendingSettle = (): void => {
		if (settleFrame == null) return;
		cancelAnimationFrame(settleFrame);
		settleFrame = null;
	};

	const restoreDrag = (state: DragState): void => {
		for (const node of state.els) restoreDragStyles(node, state.styles.get(node)!);
	};

	/** Slide siblings into the dragged row's actual slot, including variable item sizes and gaps. */
	const layoutSiblings = (): void => {
		if (!drag) return;
		const { els, from, over, centers } = drag;
		for (let i = 0; i < els.length; i++) {
			if (i === from) continue;
			let shift = 0;
			if (from < over && i > from && i <= over) shift = centers[i - 1]! - centers[i]!;
			else if (over < from && i >= over && i < from) shift = centers[i + 1]! - centers[i]!;
			setReorderOffset(els[i]!, horizontal, shift);
		}
	};

	const onMove = (e: PointerEvent): void => {
		if (!drag || e.pointerId !== drag.pointerId) return;
		const { centers, from } = drag;
		const delta = coordOf(e) - drag.start;
		setReorderOffset(drag.el, horizontal, delta);
		const targetCenter = centers[from]! + delta;
		const over = nearestCenterIndex(centers, targetCenter);
		if (over !== drag.over) {
			drag.over = over;
			layoutSiblings();
		}
	};

	const endDrag = (e: PointerEvent): void => {
		if (!drag || e.pointerId !== drag.pointerId) return;
		const state = drag;
		const { el, els, from, over, pointerId } = state;
		state.unlisten();
		release(el, pointerId);
		drag = null;

		// Capture the composed visual position, restore every property this drag
		// owns, commit data, then FLIP into the freshly laid-out slots.
		const fromRects = els.map((node) => snapshotRect(node));
		restoreDrag(state);

		if (over !== from) options.onReorder(arrayMove(options.items(), from, over));

		cancelPendingSettle();
		settleFrame = requestAnimationFrame(() => {
			settleFrame = null;
			for (let i = 0; i < els.length; i++) {
				flipFrom(els[i]!, fromRects[i]!, { duration, easing: options.easing });
			}
		});
	};

	const cancelDrag = (): void => {
		if (!drag) return;
		const state = drag;
		const { el, pointerId } = state;
		state.unlisten();
		release(el, pointerId);
		drag = null;
		restoreDrag(state);
	};

	const onDown =
		(el: HTMLElement) =>
		(e: PointerEvent): void => {
			if (e.button !== 0 || drag) return;
			const order = options.items();
			const keys = order.map(keyOf);
			// A value is a safe default key only while it is unique. Refuse an
			// ambiguous drag rather than moving the wrong row; callers can supply getKey.
			if (new Set(keys).size !== keys.length) return;
			const els = keys.map((key) => elements.get(key));
			if (els.some((node): node is undefined => !node)) return;
			const rows = els as HTMLElement[];
			const from = rows.indexOf(el);
			if (from < 0) return;

			const rects = rows.map((node) => node.getBoundingClientRect());
			const centers = rects.map(centerOf);
			const styles = new Map(rows.map((node) => [node, snapshotDragStyles(node)]));

			drag = {
				pointerId: e.pointerId,
				el,
				from,
				over: from,
				centers,
				start: coordOf(e),
				els: rows,
				styles,
				unlisten: listen(el, {
					pointermove: onMove,
					pointerup: endDrag,
					pointercancel: endDrag
				})
			};

			// Reorder owns only its dedicated motion channel and temporary drag
			// presentation; existing transform and inline styles are never replaced.
			el.style.position = 'relative';
			el.style.zIndex = '1';
			for (let i = 0; i < rows.length; i++) {
				if (i !== from) rows[i]!.style.transition = `translate ${duration}ms`;
			}

			capture(el, e.pointerId);
		};

	const item =
		(value: T): Attachment<HTMLElement> =>
		(el) => {
			if (!isBrowser()) return;
			wireTransform(el);
			const key = keyOf(value);
			elements.set(key, el);
			const unlockTouchAction = lockTouchAction(el, horizontal ? 'x' : 'y');
			const unlisten = listen(el, { pointerdown: onDown(el) });
			return () => {
				if (drag?.els.includes(el)) cancelDrag();
				cancelPendingSettle();
				unlisten();
				if (elements.get(key) === el) elements.delete(key);
				unlockTouchAction();
			};
		};

	return { item };
};
