import type { AnimationController } from "$lib/animate/types";

/**
 * Cancel an in-flight animation controller, ignoring errors thrown when the
 * underlying animations have already been torn down (e.g. during cleanup).
 */
export const cancelController = (controller: AnimationController | null): void => {
  if (!controller) return;
  try {
    controller.cancel();
  } catch {
    // noop — animation may already be torn down
  }
};
