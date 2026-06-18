# animate/properties

The property registry and transform wiring. Maps animation keys (`x`, `scale`, `width`, `opacity`, …) to their CSS targets and manages the `--motion-*` custom properties that let transform components animate independently.

| File | Responsibility |
| --- | --- |
| `properties.ts` | The static `PROPERTY_REGISTRY` (50+ props) mapping each key to its CSS equivalent, default unit, and initial value. Transform components map to motion custom properties (`--motion-x`, `--motion-scale`, …). |
| `prop-utils.ts` | `formatValue()` appends default units; `resolveProp()` looks up known props or kebab-cases unknown keys into raw CSS; `readCurrentValue()` snapshots the computed value for an implicit `from`. |
| `style-utils.ts` | `saveStyleProp()` / `restoreStyleProp()` capture and restore inline properties (with `!important` priority) around temporary writes. |
| `transform-setup.ts` | `ensurePropertiesRegistered()` registers the motion vars via `CSS.registerProperty` for smooth interpolation; `ensureTransformWired()` injects the `translate`/`scale`/`rotate` inline styles that read those vars. |
| `transform-tracker.ts` | Per-element ref-counting of in-flight transform animations. `registerTransformAnimation()` / `deregisterTransformAnimation()` track active vars; `measureWithoutAncestorTransforms()` temporarily suppresses ancestor motion vars to read at-rest rects. |

This wiring is what lets two separate `animate()` calls (or a sibling [`flip()`](../../flip/README.md)) touch the same element's transform without clobbering each other.
