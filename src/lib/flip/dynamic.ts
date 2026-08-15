/**
 * Reactive `class` / `style` application for the FLIP attachment.
 *
 * The attachment owns these writes so the FLIP sequence is deterministic:
 * measure `from` → write → measure `to` → animate, with no frame in between.
 *
 * Every write is a diff against what *we* previously applied — never a
 * wholesale `className =` / `cssText =`. The animator writes `--motion-*` and
 * `pointer-events` inline on the same element, and markup may carry its own
 * classes; clobbering either would break an in-flight animation or the
 * component's own styling.
 *
 * ponytail: a *dynamic* `class={…}` in markup still wins — Svelte's `set_class`
 * assigns `className` wholesale when its expression changes, and we have no
 * dependency on that. Use this option or a dynamic `class={…}`, not both. If
 * that ever bites in practice, re-assert from a `MutationObserver` on the
 * `class` attribute.
 */

import type { ClassValue } from 'svelte/elements';
import type { MotionElement } from '../shared/types';

export interface DynamicAttrs {
	/** Write class/style; returns `true` when the DOM actually changed. */
	write: (classValue: ClassValue | undefined, styleValue: string | undefined) => boolean;
	/** Remove everything we applied (teardown). */
	reset: () => void;
}

/** Flatten Svelte's `ClassValue` shape into individual class tokens. */
const flattenClass = (value: ClassValue | undefined): string[] => {
	if (!value) return [];
	if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
	if (Array.isArray(value)) return value.flatMap((entry) => flattenClass(entry as ClassValue));
	return Object.keys(value).filter((key) => value[key]);
};

/**
 * Parse a CSS declaration string with the platform's own parser — a detached
 * element handles `!important`, comments, quoting, custom properties, and
 * malformed input for free. Never assign `cssText` on the live element.
 */
let parser: MotionElement | null = null;

const parseStyle = (value: string | undefined): Map<string, string> => {
	const declarations = new Map<string, string>();
	if (!value) return declarations;
	parser ??= document.createElement('div');
	parser.style.cssText = value;
	const { style } = parser;
	for (let i = 0; i < style.length; i++) {
		const name = style[i];
		const priority = style.getPropertyPriority(name);
		declarations.set(name, style.getPropertyValue(name) + (priority ? ` !${priority}` : ''));
	}
	return declarations;
};

/** Split a stored declaration back into the value/priority pair `setProperty` wants. */
const splitPriority = (declaration: string): [value: string, priority: string] =>
	declaration.endsWith(' !important')
		? [declaration.slice(0, -' !important'.length), 'important']
		: [declaration, ''];

export const createDynamicAttrs = (element: MotionElement): DynamicAttrs => {
	let classes: string[] = [];
	let styles = new Map<string, string>();

	return {
		write(classValue, styleValue) {
			const nextClasses = flattenClass(classValue);
			const nextStyles = parseStyle(styleValue);
			let changed = false;

			for (const token of classes) {
				if (!nextClasses.includes(token)) {
					element.classList.remove(token);
					changed = true;
				}
			}
			for (const token of nextClasses) {
				if (!element.classList.contains(token)) {
					element.classList.add(token);
					changed = true;
				}
			}
			classes = nextClasses;

			for (const name of styles.keys()) {
				if (!nextStyles.has(name)) {
					element.style.removeProperty(name);
					changed = true;
				}
			}
			for (const [name, declaration] of nextStyles) {
				if (styles.get(name) === declaration) continue;
				element.style.setProperty(name, ...splitPriority(declaration));
				changed = true;
			}
			styles = nextStyles;

			return changed;
		},
		reset() {
			for (const token of classes) element.classList.remove(token);
			for (const name of styles.keys()) element.style.removeProperty(name);
			classes = [];
			styles = new Map();
		}
	};
};
