/**
 * Variants — named animation states over `animate()`.
 *
 * - `createVariants()` — imperative controller (`to`, `apply`, `stop`).
 * - `variants()` — reactive Svelte attachment driven by a state thunk.
 */

export { createVariants, variants } from './variants.svelte';
export type {
	VariantMap,
	VariantsOptions,
	VariantsController,
	VariantsAttachmentOptions
} from './variants.svelte';
