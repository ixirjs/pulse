/**
 * FLIP (First, Last, Invert, Play) animation utilities for Svelte 5.
 *
 * - Zero-config: `{@attach flip()}` animates layout shifts.
 * - Reactive: pass a thunk to drive remeasures from `$state`.
 * - Auto-tracking: ResizeObserver + parent MutationObserver.
 * - Shared-element: opt-in via {@link createFlipScope} + `layoutId`.
 * - Honors `prefers-reduced-motion` by default.
 * - Composes safely with sibling `animate()` calls — both go through the
 *   same `--motion-*` custom properties so transforms never clobber.
 */
export * from './flip/index.js';
export * from './animate/index.js';
export * from './easing/index.js';
export * from './scroll/index.js';
export * from './gestures/index.js';
export * from './presence/index.js';
export * from './variants/index.js';
export * from './gradient/index.js';
export * from './morph/index.js';
export * from './text/index.js';
export * from './view-transition/index.js';
