/**
 * A single-slot holder for the in-flight FLIP controller.
 *
 * Both the `flip()` attachment and the switcher run at most one animation per
 * element at a time: starting a new run cancels the previous one, and the slot
 * auto-clears when an animation settles naturally. Centralizing that lifecycle
 * keeps the attachment files declarative and removes the duplicated
 * cancel / wrap-onEnd / null-on-finish boilerplate.
 */

import type { AnimationController } from "$lib/animate/types";
import { animateFlip } from "./animator";
import { cancelController } from "./cancel-controller";
import type { FlipAnimateArgs } from "../types";

interface ControllerSlot {
  /** Cancel any in-flight controller, then start a new FLIP animation. */
  run: (args: FlipAnimateArgs) => void;
  /** Cancel the current controller and empty the slot (teardown). */
  cancel: () => void;
}

export const createControllerSlot = (): ControllerSlot => {
  let current: AnimationController | null = null;

  return {
    run: ({ options, ...rest }) => {
      cancelController(current);
      current = animateFlip({
        ...rest,
        options: {
          ...options,
          // Clear the slot only on a natural finish — a cancel (finished:
          // false) is always followed by a fresh assignment below, so guarding
          // on `finished` prevents the outgoing run from nulling the new one.
          onEnd: (el, info) => {
            if (info.finished) current = null;
            options?.onEnd?.(el, info);
          },
        },
      });
    },
    cancel: () => {
      cancelController(current);
      current = null;
    },
  };
};
