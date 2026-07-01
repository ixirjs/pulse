/**
 * `swipeable()` — a single-pointer fling attachment that reports a discrete
 * directional swipe on release. It tracks the press, the travel and the live
 * pointer velocity (the same two-sample scheme `draggable` uses for momentum),
 * then fires `onSwipe('left' | 'right' | 'up' | 'down', info)` when the gesture
 * clears a distance *or* velocity threshold. Use it for swipe-to-dismiss,
 * swipe-to-delete, card stacks and carousel paging.
 *
 * @example
 * ```svelte
 * <div {@attach swipeable({ onSwipe: (dir) => dir === 'left' && dismiss() })} />
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '$lib/shared/browser';
import type { MotionElement } from '$lib/animate';
import { capture, release } from './pointer-capture';

export type SwipeAxis = 'x' | 'y' | 'both';
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeInfo {
	direction: SwipeDirection;
	/** Net travel from press to release, in px. */
	distanceX: number;
	distanceY: number;
	/** Pointer velocity at release, in px/second. */
	velocityX: number;
	velocityY: number;
}

export interface SwipeableOptions {
	/** Restrict recognised swipes to one axis. Default `'both'`. */
	axis?: SwipeAxis;
	/** Minimum travel to count as a swipe, in px. Default `30`. */
	threshold?: number;
	/** Release speed that counts as a swipe regardless of distance, px/s. Default `300`. */
	velocityThreshold?: number;
	/** Disable without removing the attachment. */
	disabled?: boolean;
	onSwipe?: (direction: SwipeDirection, info: SwipeInfo, element: MotionElement) => void;
}

const touchActionFor = (axis: SwipeAxis): string =>
	axis === 'x' ? 'pan-y' : axis === 'y' ? 'pan-x' : 'none';

/** Create a swipeable attachment. */
export const swipeable = (options: SwipeableOptions = {}): Attachment<MotionElement> => {
	const {
		axis = 'both',
		threshold = 30,
		velocityThreshold = 300,
		disabled = false,
		onSwipe
	} = options;

	return (element) => {
		if (!isBrowser() || disabled) return;

		const prevTouchAction = element.style.touchAction;
		element.style.touchAction = touchActionFor(axis);

		let tracking = false;
		let pointerId = -1;
		let startX = 0;
		let startY = 0;
		// Velocity from the last two pointer samples.
		let lastX = 0;
		let lastY = 0;
		let lastT = 0;
		let velX = 0;
		let velY = 0;

		const onPointerDown = (event: PointerEvent): void => {
			if (tracking || event.button !== 0) return;
			tracking = true;
			pointerId = event.pointerId;
			capture(element, pointerId);
			startX = lastX = event.clientX;
			startY = lastY = event.clientY;
			lastT = event.timeStamp;
			velX = 0;
			velY = 0;
		};

		const onPointerMove = (event: PointerEvent): void => {
			if (!tracking || event.pointerId !== pointerId) return;
			const dt = (event.timeStamp - lastT) / 1000;
			if (dt > 0) {
				velX = (event.clientX - lastX) / dt;
				velY = (event.clientY - lastY) / dt;
			}
			lastX = event.clientX;
			lastY = event.clientY;
			lastT = event.timeStamp;
		};

		const onPointerUp = (event: PointerEvent): void => {
			if (!tracking || event.pointerId !== pointerId) return;
			tracking = false;
			release(element, pointerId);

			const dx = event.clientX - startX;
			const dy = event.clientY - startY;

			// Decide the swipe axis first, then test distance / velocity on *that*
			// axis only — so an axis-locked swipe never fires from cross-axis travel.
			const horizontal = axis === 'x' ? true : axis === 'y' ? false : Math.abs(dx) >= Math.abs(dy);
			const distance = horizontal ? Math.abs(dx) : Math.abs(dy);
			const speed = horizontal ? Math.abs(velX) : Math.abs(velY);
			if (distance < threshold && speed < velocityThreshold) return;

			const direction: SwipeDirection = horizontal
				? dx > 0
					? 'right'
					: 'left'
				: dy > 0
					? 'down'
					: 'up';
			onSwipe?.(
				direction,
				{ direction, distanceX: dx, distanceY: dy, velocityX: velX, velocityY: velY },
				element
			);
		};

		const onCancel = (event: PointerEvent): void => {
			if (event.pointerId === pointerId) {
				tracking = false;
				release(element, pointerId);
			}
		};

		const down = onPointerDown as EventListener;
		const move = onPointerMove as EventListener;
		const up = onPointerUp as EventListener;
		const cancel = onCancel as EventListener;
		element.addEventListener('pointerdown', down);
		element.addEventListener('pointermove', move);
		element.addEventListener('pointerup', up);
		element.addEventListener('pointercancel', cancel);

		return () => {
			element.removeEventListener('pointerdown', down);
			element.removeEventListener('pointermove', move);
			element.removeEventListener('pointerup', up);
			element.removeEventListener('pointercancel', cancel);
			element.style.touchAction = prevTouchAction;
		};
	};
};
