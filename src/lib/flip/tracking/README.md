# flip/tracking

Layout observation and frame scheduling for [`flip`](../README.md). This is what makes `flip()` auto-track layout shifts without the caller manually triggering a remeasure.

| File | Responsibility |
| --- | --- |
| `observers.ts` | `createLayoutObservers({ element, onChange })` — combines a `ResizeObserver` (on the element) and a `MutationObserver` (on its parent) to detect size and reflow changes. `connect()` is idempotent and handles reparenting. |
| `observer-manager.ts` | `createObserverManager()` — wraps `LayoutObservers` behind a `{ connect, disconnect }` interface so the attachment can reconnect to a new element without leaking observers. |
| `scheduler.ts` | `createReflowScheduler(task)` — a RAF-batched scheduler. Coalesces multiple `schedule()` calls in a frame into a single task on the next animation frame; degrades to synchronous execution outside the DOM. |

The attachment in [`../integration`](../integration/README.md) drives these: observers report a change → the scheduler batches it → the animator replays the FLIP.
