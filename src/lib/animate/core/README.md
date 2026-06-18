# animate/core

The animation engine — the `animate()` orchestrator and the `AnimationController` that owns each animation's lifecycle. This is the heart that the rest of [`animate`](../README.md) feeds into.

| File | Responsibility |
| --- | --- |
| `animate.ts` | The `animate()` entry point. Resolves keyframes (via [`../keyframes`](../keyframes/README.md)), registers transform wiring (via [`../properties`](../properties/README.md)), starts the WAAPI animations, and returns a controller. Handles the SSR and reduced-motion fast paths (apply end state, skip animation). |
| `controller.ts` | `AnimationController` — wraps one or more WAAPI `Animation` objects behind a single lifecycle: `pause`, `play`, `reverse`, `seek(ms)`, `stop` (commit current position, then cancel), `cancel`, a settable `playbackRate`, and a lazily-built `finished` promise. Owns the `onStart`/`onEnd` hooks and inline-style cleanup. |

Because each transform component animates through its own `--motion-*` custom property, one controller may drive several `Animation` objects at once (`controller.animations` exposes them).
