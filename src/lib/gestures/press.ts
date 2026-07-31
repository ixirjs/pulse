/**
 * `pressable()` — pointer press attachment with proper cancel semantics: a
 * press that drifts off the element (or is interrupted) fires `onPressEnd`
 * with `pressed: false` and does *not* fire `onPress`, matching native button
 * behaviour. Pointer capture keeps tracking the same pointer throughout.
 *
 * Two discrete variants ride on the same lifecycle: `onLongPress` fires when a
 * press is held past `longPressDelay` (and then suppresses the click), and
 * `onDoubleTap` fires when two completed presses land within `doubleTapDelay`.
 *
 * @example
 * ```svelte
 * <button
 *   {@attach pressable({
 *     onPressStart: (el) => animate(el, { scale: 0.95 }),
 *     onPressEnd:   (el) => animate(el, { scale: 1 }),
 *     onPress:      () => submit(),
 *     onLongPress:  () => openMenu(),
 *     onDoubleTap:  () => like(),
 *   })}
 * />
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '../shared/browser';
import type { MotionElement } from '../animate';
import { capture, release } from './pointer-capture';

export interface PressableOptions {
	/** Pointer went down on the element. */
	onPressStart?: (element: MotionElement, event: PointerEvent) => void;
	/** Press released; `pressed` is true only when released over the element. */
	onPressEnd?: (element: MotionElement, pressed: boolean) => void;
	/** Completed press (down + up over the element) — the "click". */
	onPress?: (element: MotionElement) => void;
	/** Press held past `longPressDelay`. Suppresses the following `onPress`. */
	onLongPress?: (element: MotionElement) => void;
	/** Two completed presses within `doubleTapDelay`. */
	onDoubleTap?: (element: MotionElement) => void;
	/** How long a press must be held to count as a long press, ms. Default `500`. */
	longPressDelay?: number;
	/** Maximum gap between two presses to count as a double tap, ms. Default `300`. */
	doubleTapDelay?: number;
	/** Disable without removing the attachment. */
	disabled?: boolean;
}

/** Create a press attachment. */
export const pressable = (options: PressableOptions = {}): Attachment<MotionElement> => {
	const {
		onPressStart,
		onPressEnd,
		onPress,
		onLongPress,
		onDoubleTap,
		longPressDelay = 500,
		doubleTapDelay = 300,
		disabled = false
	} = options;

	return (element) => {
		if (!isBrowser() || disabled) return;

		let pressed = false;
		let pointerId = -1;
		let longPressed = false;
		let longPressTimer: ReturnType<typeof setTimeout> | null = null;
		let lastTapTime = -Infinity;

		const clearLongPress = (): void => {
			if (longPressTimer != null) {
				clearTimeout(longPressTimer);
				longPressTimer = null;
			}
		};

		const end = (over: boolean, time: number): void => {
			if (!pressed) return;
			pressed = false;
			clearLongPress();
			release(element, pointerId);
			onPressEnd?.(element, over);
			// A long press already fired its own gesture; it isn't a click or a tap.
			if (!over || longPressed) return;
			onPress?.(element);
			if (onDoubleTap) {
				if (time - lastTapTime <= doubleTapDelay) {
					lastTapTime = -Infinity;
					onDoubleTap(element);
				} else {
					lastTapTime = time;
				}
			}
		};

		const onDown = (event: PointerEvent): void => {
			if (pressed || event.button !== 0) return;
			pressed = true;
			longPressed = false;
			pointerId = event.pointerId;
			capture(element, pointerId);
			onPressStart?.(element, event);
			if (onLongPress) {
				longPressTimer = setTimeout(() => {
					longPressTimer = null;
					if (pressed) {
						longPressed = true;
						onLongPress(element);
					}
				}, longPressDelay);
			}
		};
		const onUp = (event: PointerEvent): void => {
			if (event.pointerId !== pointerId) return;
			// With pointer capture, "over" is decided by hit-testing the release point.
			const target = document.elementFromPoint(event.clientX, event.clientY);
			end(target != null && element.contains(target), event.timeStamp);
		};
		const onCancel = (event: PointerEvent): void => {
			if (event.pointerId === pointerId) end(false, event.timeStamp);
		};

		const down = onDown as EventListener;
		const up = onUp as EventListener;
		const cancel = onCancel as EventListener;
		element.addEventListener('pointerdown', down);
		element.addEventListener('pointerup', up);
		element.addEventListener('pointercancel', cancel);

		return () => {
			clearLongPress();
			element.removeEventListener('pointerdown', down);
			element.removeEventListener('pointerup', up);
			element.removeEventListener('pointercancel', cancel);
		};
	};
};
