/**
 * `wheelable()` — a wheel-zoom attachment for the desktop counterpart of
 * `pinchable()`. It turns `wheel` events (including the `ctrlKey` deltas a
 * trackpad pinch produces) into a multiplicative `scale`, optionally writing
 * the library's `--motion-scale` custom property so it composes with
 * `animate()` and FLIP — and with `pinchable()` — on the same element. Discrete
 * wheel ticks are bracketed into a single gesture: `onStart` fires on the first
 * tick after idle and `onEnd` fires once the wheel goes quiet.
 *
 * The applied `--motion-scale` is eased toward each tick's target by a
 * velocity-preserving spring (see `smooth`), so notched mouse wheels zoom
 * fluidly instead of jumping step to step.
 *
 * @example
 * ```svelte
 * <img {@attach wheelable({ scaleBounds: { min: 0.5, max: 4 } })} alt="" />
 * ```
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '$lib/shared/browser';
import type { MotionElement } from '$lib/animate';
import { createSpringValue } from '$lib/animate/spring-value';
import type { SpringOptions } from '$lib/shared/types';
import {
	ensurePropertiesRegistered,
	ensureTransformWired
} from '$lib/animate/properties/transform-setup';

export interface WheelInfo {
	/** Accumulated scale since the element mounted (baseline 1). */
	scale: number;
	/** Raw wheel deltas for this tick. */
	deltaX: number;
	deltaY: number;
	/** Cursor position in client coordinates. */
	center: { x: number; y: number };
}

export interface WheelableOptions {
	/** Write `--motion-scale` on each tick. Default `true`. */
	applyTransform?: boolean;
	/** Clamp the reported (and applied) scale. */
	scaleBounds?: { min?: number; max?: number };
	/** Zoom sensitivity per wheel unit. Default `0.01`. */
	speed?: number;
	/**
	 * Ease the applied `--motion-scale` toward each tick's target with a
	 * velocity-preserving spring, so discrete wheel notches ramp smoothly
	 * instead of snapping. `true` (the default) uses a snappy, overshoot-free
	 * spring; pass {@link SpringOptions} to tune it, or `false` to write the
	 * raw scale each tick. Only affects the applied transform — callbacks
	 * always report the logical target `scale`.
	 */
	smooth?: boolean | SpringOptions;
	/** Only react when `ctrlKey` is held (trackpad pinch / intentional zoom). Default `false`. */
	requireCtrl?: boolean;
	/** Call `preventDefault` so the page doesn't scroll or browser-zoom. Default `true`. */
	preventDefault?: boolean;
	/** Idle time before the gesture is considered ended, ms. Default `120`. */
	endDelay?: number;
	/** Disable without removing the attachment. */
	disabled?: boolean;
	onStart?: (info: WheelInfo, element: MotionElement) => void;
	onMove?: (info: WheelInfo, element: MotionElement) => void;
	onEnd?: (info: WheelInfo, element: MotionElement) => void;
}

/** Snappy, overshoot-free spring tuned for zoom — near-critical damping. */
const SMOOTH_DEFAULTS: SpringOptions = { stiffness: 260, damping: 32 };

const clampScale = (scale: number, bounds?: { min?: number; max?: number }): number => {
	if (!bounds) return scale;
	let next = scale;
	if (bounds.min !== undefined) next = Math.max(bounds.min, next);
	if (bounds.max !== undefined) next = Math.min(bounds.max, next);
	return next;
};

/** Create a wheelable (wheel-zoom) attachment. */
export const wheelable = (options: WheelableOptions = {}): Attachment<MotionElement> => {
	const {
		applyTransform = true,
		scaleBounds,
		speed = 0.01,
		requireCtrl = false,
		preventDefault = true,
		endDelay = 120,
		disabled = false,
		smooth = true,
		onStart,
		onMove,
		onEnd
	} = options;

	return (element) => {
		if (!isBrowser() || disabled) return;

		// `scale` is the logical target (what callbacks report); the spring
		// carries the rendered value smoothly toward it across frames.
		let scale = 1;
		let active = false;
		let endTimer: ReturnType<typeof setTimeout> | null = null;
		let lastCenter = { x: 0, y: 0 };

		// Drive `--motion-scale` from a velocity-preserving spring so discrete
		// wheel notches ramp instead of snapping. Skipped when not applying the
		// transform, or when `smooth` is disabled (then we write the raw value).
		const springScale =
			applyTransform && smooth !== false
				? createSpringValue({
						initial: 1,
						...SMOOTH_DEFAULTS,
						...(smooth === true ? null : smooth)
					})
				: null;

		let detachSpring: (() => void) | null = null;
		if (applyTransform) {
			ensurePropertiesRegistered();
			ensureTransformWired(element);
			detachSpring =
				springScale?.subscribe((v) => element.style.setProperty('--motion-scale', `${v}`)) ?? null;
		}

		const info = (deltaX: number, deltaY: number): WheelInfo => ({
			scale,
			deltaX,
			deltaY,
			center: lastCenter
		});

		const finish = (): void => {
			endTimer = null;
			active = false;
			onEnd?.(info(0, 0), element);
		};

		const onWheel = (event: WheelEvent): void => {
			if (requireCtrl && !event.ctrlKey) return;
			if (preventDefault) event.preventDefault();

			lastCenter = { x: event.clientX, y: event.clientY };
			// Multiplicative zoom: scrolling up (negative deltaY) zooms in.
			scale = clampScale(scale * Math.exp(-event.deltaY * speed), scaleBounds);

			if (!active) {
				active = true;
				onStart?.(info(event.deltaX, event.deltaY), element);
			}
			if (springScale) springScale.set(scale);
			else if (applyTransform) element.style.setProperty('--motion-scale', `${scale}`);
			onMove?.(info(event.deltaX, event.deltaY), element);

			// Reset the idle timer; the gesture ends once the wheel goes quiet.
			if (endTimer != null) clearTimeout(endTimer);
			endTimer = setTimeout(finish, endDelay);
		};

		const wheel = onWheel as EventListener;
		// Non-passive so preventDefault can take effect.
		element.addEventListener('wheel', wheel, { passive: !preventDefault });

		return () => {
			if (endTimer != null) clearTimeout(endTimer);
			element.removeEventListener('wheel', wheel);
			detachSpring?.();
			springScale?.stop();
		};
	};
};
