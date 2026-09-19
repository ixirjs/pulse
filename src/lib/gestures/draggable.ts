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
import { listen } from '../shared/listen';
import { trackVelocity } from './velocity';
import type { MotionElement } from '../animate';
import type { SpringOptions } from '../shared/types';
import { createSpringValue } from '../animate/spring-value';
import { capture, lockTouchAction, release } from './pointer-capture';
import { wireTransform } from '../animate/properties/transform-setup';
import { hintTransformLayer } from '../animate/properties/properties';
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
	onStart?: (info: DragInfo, element: MotionElement) => void;
	onMove?: (info: DragInfo, element: MotionElement) => void;
	onEnd?: (info: DragInfo, element: MotionElement) => void;
}

/** Create a draggable attachment. */
export const draggable = (options: DraggableOptions = {}): Attachment<MotionElement> => {
	const {
		axis = 'both',
		constraints,
		elastic = 0,
		spring,
		snapToOrigin = false,
		momentum = true,
		onStart,
		onMove,
		onEnd
	} = options;

	return (element) => {
		if (!isBrowser()) return;

		wireTransform(element);
		const unlockTouchAction = lockTouchAction(element, axis);

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
		// Held from pointerdown until the spring stops writing, which is after the
		// release flick has settled — not at pointerup.
		let dropLayer: (() => void) | null = null;
		const releaseLayer = (): void => {
			const drop = dropLayer;
			dropLayer = null;
			drop?.();
		};
		let pointerId = -1;
		let startX = 0;
		let startY = 0;
		const velocity = trackVelocity();

		const bounds = (): DragConstraints =>
			typeof constraints === 'function' ? constraints() : (constraints ?? {});

		const info = (x: number, y: number): DragInfo => ({
			x,
			y,
			velocityX: velocity.x,
			velocityY: velocity.y
		});

		const onPointerDown = (event: PointerEvent): void => {
			if (dragging || event.button !== 0) return;
			dragging = true;
			dropLayer ??= hintTransformLayer(element);
			pointerId = event.pointerId;
			capture(element, pointerId);
			// Resume from wherever the spring currently sits (interrupt-friendly).
			springX.stop();
			springY.stop();
			startX = event.clientX - springX.current;
			startY = event.clientY - springY.current;
			velocity.reset(event);
			onStart?.(info(springX.current, springY.current), element);
		};

		const onPointerMove = (event: PointerEvent): void => {
			if (!dragging || event.pointerId !== pointerId) return;
			velocity.sample(event);

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
				if (!lockX) springX.setVelocity(velocity.x);
				if (!lockY) springY.setVelocity(velocity.y);
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
			// A new drag may start before the flick settles; it keeps the layer.
			void Promise.all([springX.finished, springY.finished]).then(() => {
				if (!dragging) releaseLayer();
			});
		};

		const unlisten = listen(element, {
			pointerdown: onPointerDown,
			pointermove: onPointerMove,
			pointerup: onPointerUp,
			pointercancel: onPointerUp
		});

		return () => {
			unlisten();
			unsubX();
			unsubY();
			springX.stop();
			springY.stop();
			releaseLayer();
			unlockTouchAction();
		};
	};
};
