/**
 * `pinchable()` — a two-pointer pinch attachment that reports live `scale` and
 * `rotation`, optionally writing the library's `--motion-scale` /
 * `--motion-rotate` custom properties so it composes with `animate()` and FLIP
 * on the same element. The gesture begins when a second pointer goes down.
 *
 * @example
 * ```svelte
 * <div {@attach pinchable({ rotate: true, scaleBounds: { min: 0.5, max: 4 } })} />
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '../shared/browser';
import { applyConstraint, type AxisBounds } from './constraints';
import { restoreStyleProp, saveStyleProp } from '../shared/inline-style';
import type { MotionElement } from '../animate';
import { capture, release } from './pointer-capture';
import {
	ensurePropertiesRegistered,
	ensureTransformWired
} from '../animate/properties/transform-setup';

export interface PinchInfo {
	/** Distance ratio of the two pointers relative to gesture start. */
	scale: number;
	/** Accumulated rotation in degrees since gesture start. */
	rotation: number;
	/** Midpoint of the two pointers in client coordinates. */
	center: { x: number; y: number };
}

export interface PinchableOptions {
	/** Track rotation alongside scale. Default `true`. */
	rotate?: boolean;
	/** Clamp the reported (and applied) scale. */
	scaleBounds?: AxisBounds;
	/** Write `--motion-scale` / `--motion-rotate` on move. Default `true`. */
	applyTransform?: boolean;
	/** Disable pinching without removing the attachment. */
	disabled?: boolean;
	onStart?: (info: PinchInfo, element: MotionElement) => void;
	onMove?: (info: PinchInfo, element: MotionElement) => void;
	onEnd?: (info: PinchInfo, element: MotionElement) => void;
}

/** Euclidean distance between two client points. */
const distance = (ax: number, ay: number, bx: number, by: number): number =>
	Math.hypot(bx - ax, by - ay);

/** Angle of the line between two client points, in degrees. */
const angle = (ax: number, ay: number, bx: number, by: number): number =>
	(Math.atan2(by - ay, bx - ax) * 180) / Math.PI;

/** Create a pinchable attachment. */
export const pinchable = (options: PinchableOptions = {}): Attachment<MotionElement> => {
	const {
		rotate = true,
		scaleBounds,
		applyTransform = true,
		disabled = false,
		onStart,
		onMove,
		onEnd
	} = options;

	return (element) => {
		if (!isBrowser() || disabled) return;

		if (applyTransform) {
			ensurePropertiesRegistered();
			ensureTransformWired(element);
		}
		const savedTouchAction = saveStyleProp(element.style, 'touch-action');
		element.style.setProperty('touch-action', 'none');

		// Live pointer positions keyed by pointerId; at most two are tracked.
		const points = new Map<number, { x: number; y: number }>();
		let pinching = false;
		let startDistance = 0;
		let startAngle = 0;

		const info = (scale: number, rotation: number): PinchInfo => {
			const [a, b] = [...points.values()];
			return {
				scale,
				rotation,
				center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
			};
		};

		const onPointerDown = (event: PointerEvent): void => {
			if (points.size >= 2) return;
			points.set(event.pointerId, { x: event.clientX, y: event.clientY });
			capture(element, event.pointerId);
			// Gesture begins once the second pointer is down.
			if (points.size === 2 && !pinching) {
				pinching = true;
				const [a, b] = [...points.values()];
				startDistance = distance(a.x, a.y, b.x, b.y);
				startAngle = rotate ? angle(a.x, a.y, b.x, b.y) : 0;
				onStart?.(info(1, 0), element);
			}
		};

		const onPointerMove = (event: PointerEvent): void => {
			const point = points.get(event.pointerId);
			if (!point) return;
			point.x = event.clientX;
			point.y = event.clientY;
			if (!pinching) return;

			const [a, b] = [...points.values()];
			const currentDistance = distance(a.x, a.y, b.x, b.y);
			const scale = applyConstraint(
				startDistance > 0 ? currentDistance / startDistance : 1,
				scaleBounds ?? {}
			);
			const rotation = rotate ? angle(a.x, a.y, b.x, b.y) - startAngle : 0;

			if (applyTransform) {
				// Baseline scale of 1; multiplying keeps composition explicit.
				element.style.setProperty('--motion-scale', `${1 * scale}`);
				if (rotate) element.style.setProperty('--motion-rotate', `${rotation}deg`);
			}
			onMove?.(info(scale, rotation), element);
		};

		const onPointerUp = (event: PointerEvent): void => {
			if (!points.has(event.pointerId)) return;
			release(element, event.pointerId);
			if (pinching) {
				const [a, b] = [...points.values()];
				const currentDistance = distance(a.x, a.y, b.x, b.y);
				const scale = applyConstraint(
					startDistance > 0 ? currentDistance / startDistance : 1,
					scaleBounds ?? {}
				);
				const rotation = rotate ? angle(a.x, a.y, b.x, b.y) - startAngle : 0;
				onEnd?.(info(scale, rotation), element);
			}
			// Lifting either pointer ends the gesture and resets.
			pinching = false;
			points.delete(event.pointerId);
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
			points.clear();
			restoreStyleProp(element.style, 'touch-action', savedTouchAction);
		};
	};
};
