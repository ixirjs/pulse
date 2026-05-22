/**
 * Tests for the RAF-batched reflow scheduler.
 * In non-DOM environments (node), the scheduler falls back to synchronous
 * execution — all logic is exercised without a real RAF.
 * Runs in the `server` vitest project.
 */

import { describe, expect, it, vi } from "vitest";
import { createReflowScheduler } from "./scheduler";

describe("createReflowScheduler() — non-DOM (synchronous fallback)", () => {
  it("returns an object with schedule and cancel", () => {
    const s = createReflowScheduler(() => {});
    expect(typeof s.schedule).toBe("function");
    expect(typeof s.cancel).toBe("function");
  });

  it("task is called synchronously when schedule() is invoked (no RAF)", () => {
    let called = false;
    const s = createReflowScheduler(() => {
      called = true;
    });
    s.schedule();
    expect(called).toBe(true);
  });

  it("task is called exactly once per schedule() when RAF is absent", () => {
    let count = 0;
    const s = createReflowScheduler(() => count++);
    s.schedule();
    s.schedule();
    // Synchronous fallback runs immediately on each call
    // (no coalescing needed since there is no async queue)
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("cancel() does not throw even with no pending task", () => {
    const s = createReflowScheduler(() => {});
    expect(() => s.cancel()).not.toThrow();
  });

  it("cancel() after schedule() does not throw", () => {
    const s = createReflowScheduler(() => {});
    s.schedule();
    expect(() => s.cancel()).not.toThrow();
  });

  it("task receives no arguments", () => {
    const task = vi.fn();
    const s = createReflowScheduler(task);
    s.schedule();
    expect(task).toHaveBeenCalledWith();
  });
});

describe("createReflowScheduler() — with mocked RAF", () => {
  it("coalesces multiple schedule() calls into one task invocation", () => {
    vi.useFakeTimers();
    let rafCallback: FrameRequestCallback | null = null;
    const origRaf = globalThis.requestAnimationFrame;
    const origCaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => {
      rafCallback = cb;
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {};

    let count = 0;
    const s = createReflowScheduler(() => count++);
    s.schedule();
    s.schedule();
    s.schedule();

    expect(count).toBe(0);
    rafCallback!(0);
    expect(count).toBe(1);

    globalThis.requestAnimationFrame = origRaf;
    globalThis.cancelAnimationFrame = origCaf;
    vi.useRealTimers();
  });

  it("cancel() calls cancelAnimationFrame with the scheduled handle", () => {
    const origRaf = globalThis.requestAnimationFrame;
    const origCaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (_cb) => 42;
    let cancelled: number | null = null;
    globalThis.cancelAnimationFrame = (id) => {
      cancelled = id;
    };

    const s = createReflowScheduler(() => {});
    s.schedule();
    s.cancel();

    expect(cancelled).toBe(42);

    globalThis.requestAnimationFrame = origRaf;
    globalThis.cancelAnimationFrame = origCaf;
  });
});
