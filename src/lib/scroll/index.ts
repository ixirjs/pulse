/**
 * Scroll-driven animation utilities.
 *
 * - `scroll()` — bind an animation's progress to scroll position.
 * - `inView()` — run effects when an element enters / leaves the viewport.
 * - Pure progress math (`coverProgress`, `containProgress`, `pageProgress`).
 */

export { scroll } from './scroll.js';
export type { ScrollOptions, ScrollAxis, ScrollRange } from './scroll.js';
export { inView } from './in-view.js';
export type { InViewOptions } from './in-view.js';
export { coverProgress, containProgress, pageProgress } from './progress.js';
