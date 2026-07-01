/**
 * Variants — named animation states over `animate()`.
 *
 * - `createVariants()` — imperative controller (`to`, `apply`, `stop`).
 * - `variants()` — reactive Svelte attachment driven by a state thunk.
 */

export { createVariants } from './variants';
export type { VariantMap, VariantsOptions, VariantsController } from './variants';
export { variants } from './variants.svelte';
export type { VariantsAttachmentOptions } from './variants.svelte';
