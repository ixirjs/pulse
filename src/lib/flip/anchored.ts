import type { AnimationController } from '../animate/types';
import { saveStyleProp, restoreStyleProp, type SavedStyleProp } from '../shared/inline-style';
import { isBrowser } from '../shared/browser';
import { animateFlip } from './animation/animator';
import { measure } from './geometry';
import { resolveOpacity } from './options';
import type { FlipOptions, FlipRect, MotionElement } from './types';

const FLIP_STYLE_PROPERTIES = ['--flip-x', '--flip-y', '--flip-scale-x', '--flip-scale-y'] as const;
const OWNED_STYLE_PROPERTIES = [...FLIP_STYLE_PROPERTIES, 'opacity', 'pointer-events'] as const;

type OwnedStyleProperty = (typeof OWNED_STYLE_PROPERTIES)[number];
type StyleSnapshot = Record<OwnedStyleProperty, SavedStyleProp>;

/** A DOM element or virtual anchor that can provide viewport geometry. */
export interface AnchoredFlipReference {
	getBoundingClientRect(): Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
}

export type AnchoredFlipReferenceGetter = () => AnchoredFlipReference | null | undefined;

/** Animation options shared by the anchored enter and exit transitions. */
export type AnchoredFlipOptions = Omit<FlipOptions, 'auto' | 'layoutId' | 'skip'>;

/** Framework-neutral lifecycle function suitable for actions, attachments, and node hooks. */
export type AnchoredFlipNodeFunction = (element: MotionElement) => (() => void) | void;

const snapshotStyles = (element: MotionElement): StyleSnapshot =>
	Object.fromEntries(
		OWNED_STYLE_PROPERTIES.map((property) => [
			property,
			property.startsWith('--flip-')
				? { value: '', priority: '' }
				: saveStyleProp(element.style, property)
		])
	) as StyleSnapshot;

const restoreStyles = (element: MotionElement, snapshot: StyleSnapshot): void => {
	for (const property of OWNED_STYLE_PROPERTIES) {
		restoreStyleProp(element.style, property, snapshot[property]);
	}
};

const measureReference = (reference: AnchoredFlipReference): FlipRect => {
	if (reference instanceof Element) return measure(reference);
	const { left: x, top: y, width, height } = reference.getBoundingClientRect();
	return { x, y, width, height };
};

/**
 * Create a lifecycle-safe FLIP transition between a mounted element and an
 * anchor. Invoke the returned node function whenever `isOpen()` changes and
 * run its cleanup before the next invocation or when the node is destroyed.
 *
 * The transition owns cancellation and its temporary FLIP, opacity, and
 * pointer-event styles. Enter always clears a previous exit's committed FLIP
 * state before measuring the mounted element.
 */
export const anchoredFlip = (
	isOpen: () => boolean,
	getReference: AnchoredFlipReferenceGetter,
	options: AnchoredFlipOptions = {}
): AnchoredFlipNodeFunction => {
	let element: MotionElement | null = null;
	let initialStyles: StyleSnapshot | null = null;
	let active: AnimationController | null = null;
	let generation = 0;
	let hasOpened = false;

	const reset = (): void => {
		if (element && initialStyles) restoreStyles(element, initialStyles);
	};

	const cancelActive = (): void => {
		const controller = active;
		active = null;
		controller?.cancel();
	};

	return (node) => {
		if (!isBrowser()) return;

		if (element !== node) {
			generation++;
			cancelActive();
			reset();
			element = node;
			initialStyles = snapshotStyles(node);
			hasOpened = false;
		}

		const token = ++generation;
		cancelActive();
		// A completed forward FLIP intentionally holds its closed visual state.
		// Remove it before any new geometry read, especially a subsequent enter.
		reset();

		const open = isOpen();
		const cleanup = (): void => {
			if (token !== generation || element !== node) return;
			generation++;
			cancelActive();
			reset();
		};

		if (!open && !hasOpened) return cleanup;

		const reference = getReference();
		if (!reference || typeof reference.getBoundingClientRect !== 'function') {
			if (!open) {
				const resolvedOpacity = resolveOpacity(options.opacity ?? true);
				if (resolvedOpacity) node.style.opacity = String(resolvedOpacity.from);
			}
			return cleanup;
		}

		const referenceRect = measureReference(reference);
		const overlayRect = measure(node);
		if (open) hasOpened = true;

		if (options.disablePointerEvents) node.style.pointerEvents = 'none';

		const { onEnd } = options;
		const opacity = options.opacity ?? true;
		const controller = animateFlip({
			element: node,
			from: open ? referenceRect : overlayRect,
			to: open ? overlayRect : referenceRect,
			forward: !open,
			options: {
				...options,
				disablePointerEvents: false,
				opacity,
				onEnd: (finishedElement, info) => {
					try {
						onEnd?.(finishedElement, info);
					} finally {
						if (token === generation && element === node) {
							active = null;
							if (initialStyles) {
								restoreStyleProp(node.style, 'pointer-events', initialStyles['pointer-events']);
								if (open) restoreStyles(node, initialStyles);
							}
						}
					}
				}
			}
		});

		active = controller;
		if (!controller && initialStyles) {
			restoreStyleProp(node.style, 'pointer-events', initialStyles['pointer-events']);
			if (open) {
				restoreStyles(node, initialStyles);
			} else {
				const resolvedOpacity = resolveOpacity(opacity);
				if (resolvedOpacity) node.style.opacity = String(resolvedOpacity.from);
			}
		}

		return cleanup;
	};
};
