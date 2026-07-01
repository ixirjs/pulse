# text

SplitText — break an element's text into per-character, per-word, or per-line wrapper `<span>`s so the pieces can be animated individually. The GSAP-SplitText analog. Pair the returned spans with [`stagger()`](../animate/README.md) for cascading reveals.

| File       | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `split.ts` | `tokenizeWords(text)` / `tokenizeChars(text)` — pure, DOM-free tokenizers (whitespace-preserving, surrogate-pair-aware) that are server-testable. `splitText(element, options)` — the DOM wrapper that builds `inline-block` spans, groups chars inside word spans (so words never fracture at line ends), measures `offsetTop` to bucket words into line wrappers, and returns the spans plus a `revert()`. SSR-safe via [`isBrowser`](../shared). |

```svelte
<script>
	import { onMount } from 'svelte';
	import { animate, stagger } from '@svelte-atoms/vibra/animate';
	import { splitText } from '@svelte-atoms/vibra/text';

	let heading;

	onMount(() => {
		const { chars, revert } = splitText(heading, { type: 'chars' });
		const delay = stagger(30);
		chars.forEach((char, i) =>
			animate(char, { opacity: [0, 1], y: [12, 0] }, { delay: delay(i, chars.length) })
		);
		return revert; // restore original markup on unmount
	});
</script>

<h1 bind:this={heading}>Reveal me, one letter at a time</h1>
```

### Options

| Option      | Default   | Description                                                                             |
| ----------- | --------- | --------------------------------------------------------------------------------------- |
| `type`      | `'chars'` | `'chars'`, `'words'`, `'lines'`, or an array of these — which granularities to produce. |
| `charClass` | —         | Class applied to every character wrapper span.                                          |
| `wordClass` | —         | Class applied to every word wrapper span.                                               |
| `lineClass` | —         | Class applied to every line wrapper span.                                               |

### Result

`splitText()` returns `{ chars, words, lines, revert }`:

| Field    | Type            | Description                                                |
| -------- | --------------- | ---------------------------------------------------------- |
| `chars`  | `HTMLElement[]` | Per-character spans. Empty unless `'chars'` was requested. |
| `words`  | `HTMLElement[]` | Per-word spans. Empty unless `'words'` was requested.      |
| `lines`  | `HTMLElement[]` | Per-line spans. Empty unless `'lines'` was requested.      |
| `revert` | `() => void`    | Restores the element's original `innerHTML`.               |

> **Words stay intact.** Word spans are always built internally (even when only `chars` is requested) and carry `white-space: nowrap`, so characters never break mid-word at a line end. **Lines** are grouped by measuring each word span's `offsetTop` after layout — words sharing an offset are on the same visual line — so the line buckets reflect the element's _current_ width. Re-run after a resize if the wrap changes.
>
> **SSR.** Outside a browser, `splitText()` returns empty arrays and a no-op `revert`, so it is safe to call unconditionally; do the actual split in `onMount`.
