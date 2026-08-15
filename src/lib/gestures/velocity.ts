/**
 * Two-sample pointer velocity tracking, shared by the gestures that hand a
 * release velocity onward — `draggable` (into its settle spring) and `swipe`
 * (into its velocity threshold).
 *
 * Two samples is deliberately the whole model: it reads the *current* flick
 * rather than an average that lags behind a direction change mid-drag.
 */

export interface VelocityTracker {
	/** Horizontal velocity in px/second, from the last two samples. */
	readonly x: number;
	/** Vertical velocity in px/second, from the last two samples. */
	readonly y: number;
	/** Start a new gesture at this event: seed the sample point, zero velocity. */
	reset(event: PointerEvent): void;
	/** Fold another pointer position into the velocity estimate. */
	sample(event: PointerEvent): void;
}

/** Create a velocity tracker; `reset()` on pointerdown, `sample()` on pointermove. */
export const trackVelocity = (): VelocityTracker => {
	let lastX = 0;
	let lastY = 0;
	let lastT = 0;
	let velX = 0;
	let velY = 0;

	return {
		get x() {
			return velX;
		},
		get y() {
			return velY;
		},
		reset(event) {
			lastX = event.clientX;
			lastY = event.clientY;
			lastT = event.timeStamp;
			velX = 0;
			velY = 0;
		},
		sample(event) {
			// A zero (or backwards) dt would divide by zero; keep the last estimate.
			const dt = (event.timeStamp - lastT) / 1000;
			if (dt > 0) {
				velX = (event.clientX - lastX) / dt;
				velY = (event.clientY - lastY) / dt;
			}
			lastX = event.clientX;
			lastY = event.clientY;
			lastT = event.timeStamp;
		}
	};
};
