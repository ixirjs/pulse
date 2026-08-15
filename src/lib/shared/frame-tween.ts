/**
 * Small lifecycle owner for requestAnimationFrame-based, duration-bound work.
 *
 * The caller owns what each progress sample means; this module owns scheduling,
 * delay, completion, cancellation, and the settled promise. Keeping those
 * concerns together prevents the library's JS-driven animation helpers from
 * drifting in their terminal and cancellation behavior.
 */

export interface FrameTween {
	/** Resolves when the tween reaches its terminal progress or is cancelled. */
	readonly finished: Promise<void>;
	/** Stop future frames without rendering a terminal sample or calling `onComplete`. */
	cancel(): void;
}

interface FrameTweenOptions {
	duration: number;
	/** Delay in ms, counted from the first browser frame. */
	delay: number;
	/** Render progress 0 synchronously before scheduling the first frame. */
	renderInitial?: boolean;
	onFrame: (progress: number) => void;
	onComplete?: () => void;
}

/** Run a cancellable rAF tween while preserving the caller's timing contract. */
export const frameTween = ({
	duration,
	delay,
	renderInitial = false,
	onFrame,
	onComplete
}: FrameTweenOptions): FrameTween => {
	let frame: number | null = null;
	let startTime: number | null = null;
	let done = false;
	let resolveFinished!: () => void;
	const finished = new Promise<void>((resolve) => (resolveFinished = resolve));

	const finish = (completed: boolean): void => {
		if (done) return;
		done = true;
		if (frame != null) cancelAnimationFrame(frame);
		frame = null;
		if (completed) onComplete?.();
		resolveFinished();
	};

	const tick = (now: number): void => {
		if (startTime == null) startTime = now + delay;
		const elapsed = now - startTime;
		if (elapsed < 0) {
			frame = requestAnimationFrame(tick);
			return;
		}

		const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 1;
		onFrame(progress);
		if (progress >= 1) finish(true);
		else frame = requestAnimationFrame(tick);
	};

	if (renderInitial) onFrame(0);
	frame = requestAnimationFrame(tick);

	return { finished, cancel: () => finish(false) };
};
