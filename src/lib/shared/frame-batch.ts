/**
 * Shared requestAnimationFrame batch for independently-owned visual updates.
 *
 * A batch preserves each subscriber's callback while ensuring a burst of
 * schedules across attachments produces one browser frame request. Subscribers
 * may safely remove themselves during a flush.
 *
 * The flush is two-phase: every callback runs first (the read phase), and any
 * function a callback returns runs after all of them (the write phase). A
 * subscriber that measures then animates should return its writes, so N
 * subscribers cost one layout instead of N forced reflows. The read phase also
 * runs as one measurement batch, so an animating ancestor shared by many
 * measured elements is suppressed and restored once per frame, not per element.
 */

import { batchMeasurements } from '../animate/properties/transform-tracker.js';

/** Read-phase callback; may return the writes to apply once every read is done. */
export type FrameBatchCallback = () => void | (() => void);

export interface FrameBatch {
	/** Queue this subscriber once for the next animation frame. */
	schedule(): void;
	/** Remove this subscriber without affecting other queued work. */
	cancel(): void;
}

const pending = new Set<FrameBatchCallback>();
let frame: number | null = null;

const flush = (): void => {
	frame = null;
	const callbacks = [...pending];
	pending.clear();
	const writes: Array<() => void> = [];
	batchMeasurements(() => {
		for (const callback of callbacks) {
			const write = callback();
			if (write) writes.push(write);
		}
	});
	for (const write of writes) write();
};

/** Create a cancellable subscriber to the shared visual-update frame. */
export const createFrameBatch = (callback: FrameBatchCallback): FrameBatch => {
	let queued = false;

	const schedule = (): void => {
		if (queued) return;
		queued = true;
		pending.add(run);
		if (frame == null) frame = requestAnimationFrame(flush);
	};

	const run: FrameBatchCallback = () => {
		queued = false;
		return callback();
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
