# animate/keyframes

Turns user input into WAAPI keyframes and timing. Given the loose shorthands a caller passes to [`animate()`](../README.md) (`120`, `[from, to]`, or a full `PropConfig`), this module normalizes them, resolves timing buckets, and builds the keyframe arrays.

| File | Responsibility |
| --- | --- |
| `normalize.ts` | Expand shorthands into uniform per-property config. `normalizeInput()` parses the input form; `resolveTiming()` derives WAAPI timing, including sampling a spring's duration. |
| `keyframes.ts` | Resolve `from`/`to` endpoints, group properties by shared timing (duration / easing / delay), and build the WAAPI keyframe sets. Measures and restores intrinsic-size keywords. |
| `keyword.ts` | Detect and measure intrinsic-size keywords (`auto`, `fit-content`, `min-content`, `max-content`). `isAutoKeyword()` identifies them; `measureKeywordValue()` forces a layout pass to resolve concrete pixels. |
| `easing-utils.ts` | Convert JS easing functions into WAAPI `linear(...)` strings, cached by function reference. Spring easings carry a pre-built, high-fidelity string. |

Spring sampling and the `linear(...)` conversion lean on the spring core in [`$lib/shared`](../../shared/README.md).
