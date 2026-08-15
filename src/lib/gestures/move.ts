/**
 * `moveable()` — a pointer-tracking attachment that reports the pointer's
 * position over the element (no button pressed), normalised to the element's
 * box. Unlike `draggable` it does not move the element to follow the pointer;
 * it *reports* position so you can drive tilt, parallax, spotlight or magnetic
 * effects. Optionally it applies a springy "magnetic" pull through the
 * library's `--motion-x` / `--motion-y` custom properties, so it composes with
 * `animate()` and FLIP on the same element.
 *
 * @example
 * ```svelte
 * <!-- Magnetic button: pulls toward the cursor, springs back on leave -->
 * <button {@attach moveable({ applyTransform: true, strength: 0.4 })}>Save</button>
 *
 * <!-- Headless: drive a 3D tilt yourself from the normalised coordinates -->
 * <div {@attach moveable({ onMove: ({ nx, ny }, el) => animate(el, { rotateY: nx * 12 }) })} />
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '../shared/browser';
import { listen } from '../shared/listen';
import type { MotionElement } from '../animate';
import type { SpringOptions } from '../shared/types';
import { createSpringValue } from '../animate/spring-value';
import { wireTransform } from '../animate/properties/transform-setup';

export interface MoveInfo {
	/** Pointer position in client coordinates. */
	x: number;
	y: number;
	/** Pointer position relative to the element's top-left corner, in px. */
	localX: number;
	localY: number;
	/** Pointer position normalised from the element's centre: -1 → +1 per axis. */
	nx: number;
	ny: number;
}

export interface MoveableOptions {
	/**
	 * Apply a springy magnetic pull via `--motion-x` / `--motion-y`. The element
	 * translates toward the pointer by `offsetFromCentre * strength` and springs
	 * back to rest when the pointer leaves. Default `false` (report only).
	 */
	applyTransform?: boolean;
	/** Magnetic pull as a fraction of the pointer's offset from centre. Default `0.3`. */
	strength?: number;
	/** Spring used for the snap back to rest when the pointer leaves. */
	spring?: SpringOptions;
	/** Also react to touch pointers. Default `false` (mouse/pen only). */
	includeTouch?: boolean;
	onMoveStart?: (info: MoveInfo, element: MotionElement) => void;
	onMove?: (info: MoveInfo, element: MotionElement) => void;
	onMoveEnd?: (element: MotionElement) => void;
}

/** Create a moveable (pointer-tracking) attachment. */
export const moveable = (options: MoveableOptions = {}): Attachment<MotionElement> => {
	const {
		applyTransform = false,
		strength = 0.3,
		spring,
		includeTouch = false,
		onMoveStart,
		onMove,
		onMoveEnd
	} = options;

	return (element) => {
		if (!isBrowser()) return;

		// Only spring the axes we actually write, mirroring draggable.
		const springX = applyTransform ? createSpringValue({ ...spring, initial: 0 }) : null;
		const springY = applyTransform ? createSpringValue({ ...spring, initial: 0 }) : null;
		let unsubX = (): void => {};
		let unsubY = (): void => {};
		if (applyTransform) {
			wireTransform(element);
			unsubX = springX!.subscribe((v) => element.style.setProperty('--motion-x', `${v}px`));
			unsubY = springY!.subscribe((v) => element.style.setProperty('--motion-y', `${v}px`));
		}

		const ignore = (event: PointerEvent): boolean => !includeTouch && event.pointerType === 'touch';

		const measure = (event: PointerEvent): MoveInfo => {
			const rect = element.getBoundingClientRect();
			const localX = event.clientX - rect.left;
			const localY = event.clientY - rect.top;
			return {
				x: event.clientX,
				y: event.clientY,
				localX,
				localY,
				nx: rect.width > 0 ? (localX / rect.width) * 2 - 1 : 0,
				ny: rect.height > 0 ? (localY / rect.height) * 2 - 1 : 0
			};
		};

		const pull = (info: MoveInfo): void => {
			// Magnetic offset is the pointer's distance from centre, scaled. Written
			// live with jump() (synchronous) — the pointer path is already smooth.
			springX!.jump((info.nx * element.getBoundingClientRect().width * strength) / 2);
			springY!.jump((info.ny * element.getBoundingClientRect().height * strength) / 2);
		};

		const onEnter = (event: PointerEvent): void => {
			if (ignore(event)) return;
			onMoveStart?.(measure(event), element);
		};
		const onPointerMove = (event: PointerEvent): void => {
			if (ignore(event)) return;
			const info = measure(event);
			if (applyTransform) pull(info);
			onMove?.(info, element);
		};
		const onLeave = (event: PointerEvent): void => {
			if (ignore(event)) return;
			// Spring back to rest, carrying any momentum.
			springX?.set(0);
			springY?.set(0);
			onMoveEnd?.(element);
		};

		const unlisten = listen(element, {
			pointerenter: onEnter,
			pointermove: onPointerMove,
			pointerleave: onLeave
		});

		return () => {
			unlisten();
			unsubX();
			unsubY();
			springX?.stop();
			springY?.stop();
		};
	};
};
