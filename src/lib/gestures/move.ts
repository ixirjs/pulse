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
import { hintTransformLayer } from '../animate/properties/properties';

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

		// Held while the pointer is over the element and through the spring-back
		// after it leaves, which is still writing `--motion-x`.
		let dropLayer: (() => void) | null = null;
		const releaseLayer = (): void => {
			const drop = dropLayer;
			dropLayer = null;
			drop?.();
		};
		let hovering = false;

		const ignore = (event: PointerEvent): boolean => !includeTouch && event.pointerType === 'touch';

		// The rect is passed in, not read here: `pull` needs the same one, and a
		// spring write between two reads would force a second layout.
		const measure = (event: PointerEvent, rect: DOMRect): MoveInfo => {
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

		const pull = (info: MoveInfo, rect: DOMRect): void => {
			// Magnetic offset is the pointer's distance from centre, scaled. Written
			// live with jump() (synchronous) — the pointer path is already smooth.
			springX!.jump((info.nx * rect.width * strength) / 2);
			springY!.jump((info.ny * rect.height * strength) / 2);
		};

		const onEnter = (event: PointerEvent): void => {
			if (ignore(event)) return;
			hovering = true;
			if (applyTransform) dropLayer ??= hintTransformLayer(element);
			onMoveStart?.(measure(event, element.getBoundingClientRect()), element);
		};
		const onPointerMove = (event: PointerEvent): void => {
			if (ignore(event)) return;
			const rect = element.getBoundingClientRect();
			const info = measure(event, rect);
			if (applyTransform) pull(info, rect);
			onMove?.(info, element);
		};
		const onLeave = (event: PointerEvent): void => {
			if (ignore(event)) return;
			hovering = false;
			// Spring back to rest, carrying any momentum.
			springX?.set(0);
			springY?.set(0);
			// Re-entering before the spring-back finishes keeps the layer.
			void Promise.all([springX?.finished, springY?.finished]).then(() => {
				if (!hovering) releaseLayer();
			});
			onMoveEnd?.(element);
		};

		const unlisten = listen(element, {
			pointerenter: onEnter,
			pointermove: onPointerMove,
			pointerleave: onLeave
		});

		return () => {
			unlisten();
			releaseLayer();
			unsubX();
			unsubY();
			springX?.stop();
			springY?.stop();
		};
	};
};
