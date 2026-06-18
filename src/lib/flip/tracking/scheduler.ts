/**
 * RAF-batched scheduler.
 *
 * Multiple `schedule()` calls within the same frame coalesce into a single
 * `task()` invocation on the next animation frame.
 */

export interface ReflowScheduler {
  /** Request a deferred run; coalesces with any pending request. */
  schedule: () => void;
  /** Drop any pending run (without invoking the task). */
  cancel: () => void;
}

export const createReflowScheduler = (task: () => void): ReflowScheduler => {
  let handle: number | null = null;

  const schedule = (): void => {
    if (handle != null) return;
    if (typeof requestAnimationFrame !== "function") {
      // Non-DOM environments — run synchronously so tests still observe the
      // effect. Real browsers always have RAF.
      task();
      return;
    }
    handle = requestAnimationFrame(() => {
      handle = null;
      task();
    });
  };

  const cancel = (): void => {
    if (handle == null) return;
    cancelAnimationFrame(handle);
    handle = null;
  };

  return { schedule, cancel };
};
