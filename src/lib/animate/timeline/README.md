# animate/timeline

Sequences and parallelizes `animate()` calls along a shared clock. Backs the public `timeline()` factory documented in the [animate README](../README.md#timelines).

| File | Responsibility |
| --- | --- |
| `timeline.ts` | The `Timeline` factory. Builds lazily — the chain describes a plan that materializes on `play()` (or first access to `finished`/`animations`). |
| `timeline-types.ts` | The public `Timeline` interface (`add`, `set`, `call`, `label`, `play`, `pause`, `reverse`, `cancel`, `stop`, `seek`, `setPlaybackRate`) and `TimelineDefaults` (extends `AnimateDefaults` with a `paused` flag). |
| `timeline-position.ts` | The position-grammar parser. Resolves a `TimelinePosition` (`number \| string \| undefined`) to an absolute ms offset: absolute `123`, relative `+=200`, anchors `<` / `>`, and `label+=N` references. |
| `timeline-internals.ts` | Entry shapes (`AnimateEntry`, `SetEntry`, `CallEntry`), `computeAnimateDuration()` (estimates total time, including spring sampling), and `offsetProps()` (injects the timeline offset into per-prop delays). |

Entries are placed by the flexible position syntax, and the timeline tracks a running duration plus the most recent entry's start/end so later entries can anchor relative to them.
