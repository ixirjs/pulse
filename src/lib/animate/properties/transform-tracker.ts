/**
 * Per-element ref-counting for in-flight WAAPI transform animations.
 *
 * `measureWithoutAncestorTransforms` walks the ancestor chain and
 * temporarily suppresses motion CSS vars on every element that currently
 * has a running `animate()` transform animation, so `getBoundingClientRect()`
 * returns the element's "at rest" layout position even mid-animation.
 *
 * The tracker is intentionally separate from the property registry so the
 * static registry data and the dynamic runtime state live in different modules.
 */

import { restoreStyleProp, saveStyleProp, type SavedStyleProp } from '../../shared/inline-style';
import type { MotionElement } from '../types';

/**
 * Identity values for every motion CSS custom property that drives a
 * transform. Used to suppress ancestor transforms during measurement.
 */
const MOTION_TRANSFORM_IDENTITIES: ReadonlyArray<readonly [string, string]> = [
	['--motion-x', '0px'],
	['--motion-y', '0px'],
	['--motion-z', '0px'],
	['--motion-scale', '1'],
	['--motion-scale-x', '1'],
	['--motion-scale-y', '1'],
	['--motion-rotate', '0deg'],
	['--flip-x', '0px'],
	['--flip-y', '0px'],
	['--motion-reorder-x', '0px'],
	['--motion-reorder-y', '0px'],
	['--flip-scale-x', '1'],
	['--flip-scale-y', '1']
];

const N_TRANSFORM_VARS = MOTION_TRANSFORM_IDENTITIES.length;

/**
 * Bit position for each transform CSS var — derived from MOTION_TRANSFORM_IDENTITIES
 * so the index alignment is guaranteed consistent.
 */
export const VAR_BIT: Readonly<Record<string, number>> = Object.fromEntries(
	MOTION_TRANSFORM_IDENTITIES.map(([name], i) => [name, 1 << i])
);

/**
 * Per-element ref-count for each transform CSS var currently in-flight.
 * The Uint8Array maps directly to MOTION_TRANSFORM_IDENTITIES indices.
 * Entry is removed when all slots reach zero so suppressNode bails early.
 */
const activeTransformCounts = new WeakMap<Element, Uint8Array>();
/** Active slots mirror the count map, avoiding a full registry scan on hot paths. */
const activeTransformBits = new WeakMap<Element, number>();

const forEachBit = (bits: number, fn: (i: number) => void): void => {
	for (let b = bits, i = 0; b !== 0; b >>>= 1, i++) {
		if (b & 1) fn(i);
	}
};

/**
 * Can we write inline styles to this node? Duck-typed rather than an
 * `instanceof HTMLElement` check: the capability is what we actually need, and
 * it also holds for elements from another realm, such as an iframe, and under
 * SSR, where those globals do not exist.
 */
const isMutableElement = (n: Element): n is MotionElement =>
	typeof (n as Partial<MotionElement>).style?.setProperty === 'function';

/** Mark that an element has started a WAAPI transform animation. */
export const registerTransformAnimation = (element: Element, bits: number): void => {
	let counts = activeTransformCounts.get(element);
	if (!counts) {
		counts = new Uint8Array(N_TRANSFORM_VARS);
		activeTransformCounts.set(element, counts);
	}
	let activeBits = activeTransformBits.get(element) ?? 0;
	forEachBit(bits, (i) => {
		if (counts![i]++ === 0) activeBits |= 1 << i;
	});
	activeTransformBits.set(element, activeBits);
};

/** Mark that a WAAPI transform animation on an element has ended or was cancelled. */
export const deregisterTransformAnimation = (element: Element, bits: number): void => {
	const counts = activeTransformCounts.get(element);
	if (!counts) return;
	let activeBits = activeTransformBits.get(element) ?? 0;
	forEachBit(bits, (i) => {
		if (counts[i] > 0 && --counts[i] === 0) activeBits &= ~(1 << i);
	});
	if (activeBits === 0) {
		activeTransformCounts.delete(element);
		activeTransformBits.delete(element);
	} else {
		activeTransformBits.set(element, activeBits);
	}
};

/**
 * Like `element.getBoundingClientRect()` but walks up the ancestor chain
 * and temporarily suppresses the motion CSS vars on every ancestor that
 * currently has a running `animate()` transform animation.
 *
 * Setting the vars with `!important` beats the WAAPI animation layer in the
 * CSS cascade, so the measurement reflects the element's "at rest" position
 * even when a parent is mid-scale/translate. All inline style changes are
 * fully restored before returning — no repaint ever sees the intermediate state.
 *
 * By default the element's own in-flight transform is suppressed too, so the
 * rect reflects its resting layout box. Pass `suppressSelf: false` to keep the
 * element's own transform and read its current *visual* rect — needed when
 * interrupting an in-flight FLIP so the next run can start where the element is
 * actually on-screen instead of snapping to its resting box first.
 */
type SavedProp = { name: string; saved: SavedStyleProp };
type Suppressed = { node: MotionElement; props: SavedProp[] };

export const measureWithoutAncestorTransforms = (
	el: Element,
	{ suppressSelf = true }: { suppressSelf?: boolean } = {}
): DOMRect => {
	const suppressed: Suppressed[] = [];

	const suppressNode = (target: MotionElement): void => {
		const bits = activeTransformBits.get(target);
		if (!bits) return;
		const props: SavedProp[] = [];
		forEachBit(bits, (i) => {
			const [name, identity] = MOTION_TRANSFORM_IDENTITIES[i]!;
			props.push({ name, saved: saveStyleProp(target.style, name) });
			target.style.setProperty(name, identity, 'important');
		});
		if (props.length > 0) suppressed.push({ node: target, props });
	};

	// Suppress the element itself first so getBoundingClientRect() reflects the
	// resting position even when the element is mid-animation (e.g. during the
	// backward-fill phase of a delayed FLIP animation). Skipped when the caller
	// wants the element's live visual rect (transform included).
	if (suppressSelf && isMutableElement(el)) suppressNode(el);

	let node: Element | null = el.parentElement;
	while (node) {
		if (isMutableElement(node)) suppressNode(node);
		node = node.parentElement;
	}

	const rect = el.getBoundingClientRect();

	for (const { node, props } of suppressed) {
		for (const { name, saved } of props) restoreStyleProp(node.style, name, saved);
	}

	return rect;
};
