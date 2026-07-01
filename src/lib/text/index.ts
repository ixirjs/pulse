/**
 * Text — split an element's text into per-character / per-word / per-line
 * wrapper spans so the pieces can be animated individually (pair with
 * `stagger()` for staggered reveals). The GSAP-SplitText analog.
 */

export { splitText, tokenizeWords, tokenizeChars } from './split';
export type { SplitType, SplitTextOptions, SplitTextResult } from './split';
