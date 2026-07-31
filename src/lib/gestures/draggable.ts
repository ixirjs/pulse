/**
 * `draggable()` — a pointer-drag attachment that writes the library's
 * `--motion-x` / `--motion-y` custom properties, so it composes with `animate()`
 * and FLIP on the same element. On release it hands the live drag velocity to a
 * spring, giving natural momentum and elastic snap-back.
 *
 * @example
 * ```svelte
 * <div {@attach draggable({ axis: 'x', constraints: { left: -100, right: 100 }, elastic: 0.2 })} />
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '../shared/browser';
import { restoreStyleProp, saveStyleProp } from '../shared/inline-style';
import type { MotionElement } from '../animate';
import type { SpringOptions } from '../shared/types';
import { createSpringValue } from '../animate/spring-value';
import { capture, release } from './pointer-capture';
import {
	ensurePropertiesRegistered,
	ensureTransformWired
} from '../animate/properties/transform-setup';
import { applyConstraint, xBounds, yBounds, type DragConstraints } from './constraints';

export type DragAxis = 'x' | 'y' | 'both';

export interface DragInfo {
	/** Current offset from the drag origin. */
	x: number;
	y: number;
	/** Pointer velocity at this instant (units/second). */
	velocityX: number;
	velocityY: number;
}

export interface DraggableOptions {
	/** Lock dragging to one axis. Default `'both'`. */
	axis?: DragAxis;
	/** Bounds in offset coordinates; a thunk re-reads them per drag. */
	constraints?: DragConstraints | (() => DragConstraints);
	/** Rubber-band resistance past constraints (0 = wall, 1 = none). Default 0. */
	elastic?: number;
	/** Spring used for release momentum and snap-back. */
	spring?: SpringOptions;
	/** Spring back to the origin on release instead of staying put. Default false. */
	snapToOrigin?: boolean;
	/** Carry release velocity into the settle spring. Default true. */
	momentum?: boolean;
	/** Disable dragging without removing the attachment. */
	disabled?: boolean;
	onStart?: (info: DragInfo, element: MotionElement) => void;
	onMove?: (info: DragInfo, element: MotionElement) => void;
	onEnd?: (info: DragInfo, element: MotionElement) => void;
}

const touchActionFor = (axis: DragAxis): string =>
	axis === 'x' ? 'pan-y' : axis === 'y' ? 'pan-x' : 'none';

/** Create a draggable attachment. */
export const draggable = (options: DraggableOptions = {}): Attachment<MotionElement> => {
	const {
		axis = 'both',
		constraints,
		elastic = 0,
		spring,
		snapToOrigin = false,
		momentum = true,
		disabled = false,
		onStart,
		onMove,
		onEnd
	} = options;

	return (element) => {
		if (!isBrowser() || disabled) return;

		ensurePropertiesRegistered();
		ensureTransformWired(element);
		const savedTouchAction = saveStyleProp(element.style, 'touch-action');
		element.style.setProperty('touch-action', touchActionFor(axis));

		const lockX = axis === 'y';
		const lockY = axis === 'x';

		const springX = createSpringValue({ ...spring, initial: 0 });
		const springY = createSpringValue({ ...spring, initial: 0 });
		// Only subscribe (and thus write) the axes this drag actually controls, so
		// a single-axis drag never touches the other axis's custom property.
		const unsubX = lockX
			? () => {}
			: springX.subscribe((v) => element.style.setProperty('--motion-x', `${v}px`));
		const unsubY = lockY
			? () => {}
			: springY.subscribe((v) => element.style.setProperty('--motion-y', `${v}px`));

		let dragging = false;
		let pointerId = -1;
		let startX = 0;
		let startY = 0;
		// Velocity tracking from the last two pointer samples.
		let lastX = 0;
		let lastY = 0;
		let lastT = 0;
		let velX = 0;
		let velY = 0;

		const bounds = (): DragConstraints =>
			typeof constraints === 'function' ? constraints() : (constraints ?? {});

		const info = (x: number, y: number): DragInfo => ({
			x,
			y,
			velocityX: velX,
			velocityY: velY
		});

		const onPointerDown = (event: PointerEvent): void => {
			if (dragging || event.button !== 0) return;
			dragging = true;
			pointerId = event.pointerId;
			capture(element, pointerId);
			// Resume from wherever the spring currently sits (interrupt-friendly).
			springX.stop();
			springY.stop();
			startX = event.clientX - springX.current;
			startY = event.clientY - springY.current;
			lastX = event.clientX;
			lastY = event.clientY;
			lastT = event.timeStamp;
			velX = 0;
			velY = 0;
			onStart?.(info(springX.current, springY.current), element);
		};

		const onPointerMove = (event: PointerEvent): void => {
			if (!dragging || event.pointerId !== pointerId) return;
			const dt = (event.timeStamp - lastT) / 1000;
			if (dt > 0) {
				velX = (event.clientX - lastX) / dt;
				velY = (event.clientY - lastY) / dt;
			}
			lastX = event.clientX;
			lastY = event.clientY;
			lastT = event.timeStamp;

			const c = bounds();
			if (!lockX) {
				springX.jump(applyConstraint(event.clientX - startX, xBounds(c), elastic));
			}
			if (!lockY) {
				springY.jump(applyConstraint(event.clientY - startY, yBounds(c), elastic));
			}
			onMove?.(info(springX.current, springY.current), element);
		};

		const settle = (): void => {
			const c = bounds();
			const targetX = snapToOrigin ? 0 : applyConstraint(springX.current, xBounds(c));
			const targetY = snapToOrigin ? 0 : applyConstraint(springY.current, yBounds(c));
			if (momentum) {
				if (!lockX) springX.setVelocity(velX);
				if (!lockY) springY.setVelocity(velY);
			}
			if (!lockX) springX.set(targetX);
			if (!lockY) springY.set(targetY);
		};

		const onPointerUp = (event: PointerEvent): void => {
			if (!dragging || event.pointerId !== pointerId) return;
			dragging = false;
			release(element, pointerId);
			onEnd?.(info(springX.current, springY.current), element);
			settle();
		};

		const down = onPointerDown as EventListener;
		const move = onPointerMove as EventListener;
		const up = onPointerUp as EventListener;
		element.addEventListener('pointerdown', down);
		element.addEventListener('pointermove', move);
		element.addEventListener('pointerup', up);
		element.addEventListener('pointercancel', up);

		return () => {
			element.removeEventListener('pointerdown', down);
			element.removeEventListener('pointermove', move);
			element.removeEventListener('pointerup', up);
			element.removeEventListener('pointercancel', up);
			unsubX();
			unsubY();
			springX.stop();
			springY.stop();
			restoreStyleProp(element.style, 'touch-action', savedTouchAction);
		};
	};
};
