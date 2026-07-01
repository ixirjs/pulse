/**
 * Presence — spring-powered enter/exit transitions for Svelte's `transition:`,
 * `in:`, and `out:` directives. Pair with a keyed `{#each}` for list
 * mount/unmount choreography.
 */

export { fade, fly, scale, size } from './transitions';
export type {
	PresenceParams,
	SizeFields,
	SizeValue,
	FadeParams,
	FlyParams,
	ScaleParams,
	SizeParams
} from './transitions';
