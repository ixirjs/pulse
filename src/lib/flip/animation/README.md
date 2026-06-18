# flip/animation

Transform execution and lifecycle for [`flip`](../README.md). Given a `from` and `to` rect, this layer computes the inverse transform, plays it, and manages cancellation.

| File | Responsibility |
| --- | --- |
| `animator.ts` | `animateFlip(args)` — the stateless core animator. Computes the delta between `from` and `to`, compensates for transform-origin, animates through motion custom properties (`--motion-x`, `--motion-y`, `--motion-scale-x`, `--motion-scale-y`), and optionally crossfades opacity. Returns an `AnimationController` or `null` when there's no work to do. |
| `cancel-controller.ts` | `cancelController(controller)` — safely cancel an in-flight animation, swallowing errors if it was already torn down. |
| `controller-slot.ts` | `createControllerSlot()` — a single-slot holder for the current FLIP controller. Cancels the previous animation when a new one starts and auto-clears when one finishes naturally, centralizing the lifecycle boilerplate. |

`animateFlip` runs through the same `--motion-*` properties as [`$lib/animate`](../../animate/README.md), so a FLIP and a sibling `animate()` compose without overwriting each other's transform.
