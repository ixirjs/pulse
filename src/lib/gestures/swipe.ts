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
import { isBrowser } from '../shared/browser';
import { listen } from '../shared/listen';
import { trackVelocity } from './velocity';
import type { MotionElement } from '../animate';
import { capture, lockTouchAction, release } from './pointer-capture';

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
	onSwipe?: (direction: SwipeDirection, info: SwipeInfo, element: MotionElement) => void;
}

/** Create a swipeable attachment. */
export const swipeable = (options: SwipeableOptions = {}): Attachment<MotionElement> => {
	const { axis = 'both', threshold = 30, velocityThreshold = 300, onSwipe } = options;

	return (element) => {
		if (!isBrowser()) return;

		const unlockTouchAction = lockTouchAction(element, axis);

		let tracking = false;
		let pointerId = -1;
		let startX = 0;
		let startY = 0;
		const velocity = trackVelocity();

		const onPointerDown = (event: PointerEvent): void => {
			if (tracking || event.button !== 0) return;
			tracking = true;
			pointerId = event.pointerId;
			capture(element, pointerId);
			startX = event.clientX;
			startY = event.clientY;
			velocity.reset(event);
		};

		const onPointerMove = (event: PointerEvent): void => {
			if (!tracking || event.pointerId !== pointerId) return;
			velocity.sample(event);
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
			const speed = horizontal ? Math.abs(velocity.x) : Math.abs(velocity.y);
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
				{ direction, distanceX: dx, distanceY: dy, velocityX: velocity.x, velocityY: velocity.y },
				element
			);
		};

		const onCancel = (event: PointerEvent): void => {
			if (event.pointerId === pointerId) {
				tracking = false;
				release(element, pointerId);
			}
		};

		const unlisten = listen(element, {
			pointerdown: onPointerDown,
			pointermove: onPointerMove,
			pointerup: onPointerUp,
			pointercancel: onCancel
		});

		return () => {
			unlisten();
			unlockTouchAction();
		};
	};
};
