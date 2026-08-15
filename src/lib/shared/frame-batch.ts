/**
 * Shared requestAnimationFrame batch for independently-owned visual updates.
 *
 * A batch preserves each subscriber's callback while ensuring a burst of
 * schedules across attachments produces one browser frame request. Subscribers
 * may safely remove themselves during a flush.
 */

export interface FrameBatch {
	/** Queue this subscriber once for the next animation frame. */
	schedule(): void;
	/** Remove this subscriber without affecting other queued work. */
	cancel(): void;
}

const pending = new Set<() => void>();
let frame: number | null = null;

const flush = (): void => {
	frame = null;
	const callbacks = [...pending];
	pending.clear();
	for (const callback of callbacks) callback();
};

/** Create a cancellable subscriber to the shared visual-update frame. */
export const createFrameBatch = (callback: () => void): FrameBatch => {
	let queued = false;

	const schedule = (): void => {
		if (queued) return;
		queued = true;
		pending.add(run);
		if (frame == null) frame = requestAnimationFrame(flush);
	};

	const run = (): void => {
		queued = false;
		callback();
	};

	const cancel = (): void => {
		if (!queued) return;
		queued = false;
		pending.delete(run);
		if (pending.size === 0 && frame != null) {
			cancelAnimationFrame(frame);
			frame = null;
		}
	};

	return { schedule, cancel };
};
