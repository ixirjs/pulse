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

/**
 * Which transform properties we installed a template into, per element. A
 * caller's own `translate` is left alone at wiring time and must also never be
 * folded into (see `keyframes/fold`) — we would be animating a value we do not
 * own.
 */
const ELEMENTS_WITH_TRANSFORM = new WeakMap<Element, Record<string, boolean>>();

/**
 * Make sure the element's `translate` / `scale` / `rotate` styles are wired
 * to read the motion CSS variables. Idempotent per element.
 */
export const ensureTransformWired = (element: MotionElement): void => {
	if (ELEMENTS_WITH_TRANSFORM.has(element)) return;
	const { style } = element;
	const owned: Record<string, boolean> = {
		translate: !style.translate,
		scale: !style.scale,
		rotate: !style.rotate
	};
	ELEMENTS_WITH_TRANSFORM.set(element, owned);
	if (owned.translate) style.translate = TRANSFORM_TEMPLATES.translate;
	if (owned.scale) style.scale = TRANSFORM_TEMPLATES.scale;
	if (owned.rotate) style.rotate = TRANSFORM_TEMPLATES.rotate;
};

/** True when the template on this transform property is ours to animate. */
export const isTransformOwned = (element: Element, target: string): boolean =>
	ELEMENTS_WITH_TRANSFORM.get(element)?.[target] === true;

/**
 * Both halves of the setup an element needs before anything writes `--motion-*`
 * to it: global property registration plus this element's transform chain.
 * Every caller needs both, so they are one call.
 */
export const wireTransform = (element: MotionElement): void => {
	ensurePropertiesRegistered();
	ensureTransformWired(element);
};
