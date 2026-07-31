---
'@ixirjs/pulse': minor
---

Trim the public surface and de-duplicate internals.

- `createFlipAttachment`, `createLayoutBridge`, `createReflowScheduler`, and their types are no longer exported from `@ixirjs/pulse/flip`; they are internals. `flip()`, `createFlipScope()`, and `createObserverManager()` remain the supported entry points.
- Single RAF batcher (`shared/frame-batch`) now backs both scroll and FLIP reflow scheduling.
- `frameTween` delay is always counted from the first browser frame; the `delayOrigin` option is gone.
