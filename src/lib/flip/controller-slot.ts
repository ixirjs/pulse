/**
 * A single-slot holder for the in-flight FLIP controller.
 *
 * Both the `flip()` attachment and the switcher run at most one animation per
 * element at a time: starting a new run cancels the previous one, and the slot
 * auto-clears when an animation settles naturally. Centralizing that lifecycle
 * keeps the attachment files declarative and removes the duplicated
 * cancel / wrap-onEnd / null-on-finish boilerplate.
 */

import type { AnimationController } from '../animate/types';
import { animateFlip } from './animator';
import { resolveDuration } from './options';
import type { FlipAnimateArgs } from './types';

/**
 * Floor for an interrupted run's shortened duration — below this a retarget
 * reads as a snap rather than a movement.
 */
const MIN_INTERRUPT_DURATION = 120;

interface ControllerSlot {
	/** Cancel any in-flight controller, then start a new FLIP animation. */
	run: (args: FlipAnimateArgs) => void;
	/** Whether a FLIP animation is currently in flight. */
	isActive: () => boolean;
	/** Cancel the current controller and empty the slot (teardown). */
	cancel: () => void;
}

/** Cancel a controller, tolerating animations already torn down during cleanup. */
const cancelSafely = (controller: AnimationController | null): void => {
	if (!controller) return;
	try {
		controller.cancel();
	} catch {
		// noop — animation may already be torn down
	}
};

export const createControllerSlot = (): ControllerSlot => {
	let current: AnimationController | null = null;
	/** Time already spent animating in the current burst of interruptions. */
	let carried = 0;

	return {
		run: ({ options, ...rest }) => {
			// A burst of triggers (drag, rapid shuffles) would otherwise restart the
			// full duration on every retarget and never settle. Charge the time already
			// spent against the replacement so the burst converges.
			carried = current ? carried + (current.currentTime ?? 0) : 0;
			cancelSafely(current);
			const requested = options?.duration;
			current = animateFlip({
				...rest,
				options: {
					...options,
					duration:
						carried > 0
							? (_distance, rects) =>
									Math.max(MIN_INTERRUPT_DURATION, resolveDuration(requested, rects) - carried)
							: requested,
					// Clear the slot only on a natural finish — a cancel (finished:
					// false) is always followed by a fresh assignment below, so guarding
					// on `finished` prevents the outgoing run from nulling the new one.
					onEnd: (el, info) => {
						if (info.finished) {
							current = null;
							carried = 0;
						}
						options?.onEnd?.(el, info);
					}
				}
			});
			// Nothing to animate (identity delta, reduced motion) ends the burst.
			if (!current) carried = 0;
		},
		isActive: () => current !== null,
		cancel: () => {
			cancelSafely(current);
			current = null;
			carried = 0;
		}
	};
};
