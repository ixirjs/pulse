/**
 * Tests for cancelController() — the defensive cancel wrapper.
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it, vi } from "vitest";
import { cancelController } from "./cancel-controller";
import type { AnimationController } from "$lib/animate/types";

const controller = (cancel: () => void): AnimationController =>
  ({ cancel }) as unknown as AnimationController;

describe("cancelController()", () => {
  it("no-ops when given null", () => {
    expect(() => cancelController(null)).not.toThrow();
  });

  it("calls cancel() on a live controller", () => {
    const cancel = vi.fn();
    cancelController(controller(cancel));
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("swallows errors thrown by cancel() (already torn down)", () => {
    const cancel = vi.fn(() => {
      throw new Error("already cancelled");
    });
    expect(() => cancelController(controller(cancel))).not.toThrow();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
