/**
 * Scroll-driven animation utilities.
 *
 * - `scroll()` — bind an animation's progress to scroll position.
 * - `inView()` — run effects when an element enters / leaves the viewport.
 * - Pure progress math (`coverProgress`, `containProgress`, `pageProgress`).
 */

export { scroll } from './scroll';
export type { ScrollOptions, ScrollAxis, ScrollRange } from './scroll';
export { inView } from './in-view';
export type { InViewOptions } from './in-view';
export { coverProgress, containProgress, pageProgress } from './progress';
