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
export * from './flip';
export * from './animate';
export * from './easing';
// Explicit index avoids relying on directory-import resolution in consuming Vite projects.
export * from './scroll/index';
export * from './gestures';
export * from './presence';
export * from './variants';
export * from './gradient';
export * from './morph';
export * from './text';
export * from './view-transition';
