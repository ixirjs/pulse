# gradient

Tween between CSS `linear-gradient` backgrounds — something WAAPI cannot do natively (`background-image` is not interpolable).

| File          | Responsibility                                                                                                                                                                                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gradient.ts` | `animateGradient(element, from, to, options)` — runs its own rAF loop: parses both gradients, resolves colour keywords through a canvas (so `"rebeccapurple"`, `hsl(...)`, resolved `currentColor`, etc. all work), and writes an interpolated gradient string each frame. Returns `{ finished, cancel }`. |
| `parse.ts`    | Pure, DOM-free gradient parsing and interpolation (`parseLinearGradient`, `parseRGBA`, `lerpRGBA`, `formatLinearGradient`, `splitTopLevel`, `resolvePositions`). Unit-tested.                                                                                                                              |

```ts
import { animateGradient } from '@svelte-atoms/vibra/gradient';

animateGradient(
	el,
	'linear-gradient(90deg, #f00 0%, #00f 100%)',
	'linear-gradient(180deg, #0f0 0%, #ff0 100%)',
	{ duration: 600 }
);
```

### Options

| Option       | Default              | Description                                           |
| ------------ | -------------------- | ----------------------------------------------------- |
| `duration`   | `400`                | Tween length in ms.                                   |
| `easing`     | ease-out             | Easing function.                                      |
| `delay`      | `0`                  | Delay before starting (ms).                           |
| `property`   | `'background-image'` | CSS property to write (e.g. `'border-image-source'`). |
| `onComplete` | —                    | Fired once when the tween settles.                    |

> **Stop-for-stop interpolation.** Best results when both gradients share the same number of colour stops; angle, each stop's colour (RGBA) and position are interpolated independently. When the stop counts differ they can't be matched one-to-one, so the tween snaps to the target. Colour keywords are resolved to RGBA before interpolation, so any valid CSS colour works on either end.
