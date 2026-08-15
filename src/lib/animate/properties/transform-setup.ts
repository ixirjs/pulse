/**
 * One-time DOM setup for the motion CSS variable transform chain.
 *
 * These functions are side-effectful — they mutate `CSS.registerProperty`
 * globals and element inline styles. Kept separate from the static registry
 * data in `properties.ts` so the data can be read without triggering setup.
 */

import { PROPERTY_REGISTRY, TRANSFORM_TEMPLATES } from './properties';
import type { MotionElement } from '../types';

let registered = false;

/**
 * Register motion CSS custom properties via `CSS.registerProperty` so that
 * the browser can interpolate them smoothly. Safe to call repeatedly; no-op
 * if the API is unavailable (older Firefox, SSR, etc.).
 */
export const ensurePropertiesRegistered = (): void => {
	if (registered) return;
	registered = true;
	if (typeof CSS === 'undefined' || typeof CSS.registerProperty !== 'function') {
		return;
	}
	for (const def of Object.values(PROPERTY_REGISTRY)) {
		if (!def.transform || !def.syntax) continue;
		try {
			CSS.registerProperty({
				name: def.css,
				syntax: def.syntax,
				inherits: false,
				initialValue: def.initial
			});
		} catch {
			// Already registered or unsupported syntax — ignore.
		}
	}
};

const ELEMENTS_WITH_TRANSFORM = new WeakSet<Element>();

/**
 * Make sure the element's `translate` / `scale` / `rotate` styles are wired
 * to read the motion CSS variables. Idempotent per element.
 */
export const ensureTransformWired = (element: MotionElement): void => {
	if (ELEMENTS_WITH_TRANSFORM.has(element)) return;
	ELEMENTS_WITH_TRANSFORM.add(element);
	const { style } = element;
	style.translate ||= TRANSFORM_TEMPLATES.translate;
	style.scale ||= TRANSFORM_TEMPLATES.scale;
	style.rotate ||= TRANSFORM_TEMPLATES.rotate;
};

/**
 * Both halves of the setup an element needs before anything writes `--motion-*`
 * to it: global property registration plus this element's transform chain.
 * Every caller needs both, so they are one call.
 */
export const wireTransform = (element: MotionElement): void => {
	ensurePropertiesRegistered();
	ensureTransformWired(element);
};
