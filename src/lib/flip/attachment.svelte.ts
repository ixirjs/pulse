/**
 * Svelte 5 attachment that wires the FLIP animator to lifecycle events,
 * layout observers, and the optional shared-layout bridge.
 *
 * This file is intentionally orchestration-only — every side-effecting
 * primitive lives in its own focused module so the pieces can be tested
 * independently.
 */

import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '../shared/browser';
import { createFrameBatch } from '../shared/frame-batch';
import type { LayoutBridge } from './bridge';
import { createDynamicAttrs } from './dynamic';
import { createControllerSlot } from './controller-slot';
import { carryVisualOffset, measure, measureVisual, rectsEqual } from './geometry';
import { createObserverManager } from './observers';
import { readOptions } from './options';
import type { FlipOptions, FlipOptionsInput, FlipRect, MotionElement } from './types';

/**
 * Core FLIP attachment factory. Shared between the standalone `flip()`
 * export and scoped instances created by `createFlipScope`.
 */
export const createFlipAttachment = (
	input: FlipOptionsInput,
	bridge: LayoutBridge | null
): Attachment<MotionElement> => {
	return (element) => {
		if (!isBrowser()) return;

		let options: FlipOptions = untrack(() => readOptions(input));
		let layoutId = options.layoutId;
		let prevRect: FlipRect | null = layoutId && bridge ? bridge.readLayout(layoutId) : null;
		let renderCount = 0;

		// The slot captures `options` by reference at call time; `applyOptions`
		// reassigns (never mutates) `options`, so each run sees a stable snapshot.
		const slot = createControllerSlot();
		const run = (from: FlipRect, to: FlipRect): void => slot.run({ element, from, to, options });

		// -----------------------------------------------------------------
		// Reflow detection — re-measure and run if the element moved.
		// -----------------------------------------------------------------
		const reflow = (): void => {
			if (!prevRect) return;
			const next = measure(element);
			// Count only cycles that would actually animate — observers deliver a
			// callback on connect, and `skip: (n) => n === 0` must land on the first
			// real move rather than that no-op.
			if (rectsEqual(prevRect, next)) {
				prevRect = next;
				return;
			}
			const render = renderCount++;
			const { skip } = options;
			const shouldSkip =
				typeof skip === 'function' ? skip(render, { from: prevRect, to: next }) : (skip ?? false);
			if (shouldSkip) {
				prevRect = next;
				return;
			}
			// Interrupting an in-flight FLIP: continue from where the element was on
			// screen *before* this layout change. The live transform is an offset from
			// the element's old resting box, so the visual rect measured now (against
			// the new box) has to be carried back onto `prevRect` — using it raw would
			// add the offset to the new slot and fling the element out of place.
			const from = slot.isActive()
				? carryVisualOffset(prevRect, next, measureVisual(element))
				: prevRect;
			prevRect = next;
			run(from, next);
		};

		// The first scheduled pass after mount only re-baselines: layout is not
		// settled when the attachment runs (siblings still mounting, fonts, images
		// loading), so a diff on that pass is the page settling, not a move worth
		// animating.
		let primed = false;
		const scheduler = createFrameBatch(() => {
			if (!primed) {
				primed = true;
				prevRect = measure(element);
				return;
			}
			reflow();
		});
		const observers = createObserverManager();
		const attrs = createDynamicAttrs(element);

		// -----------------------------------------------------------------
		// Track option changes (when caller passes a thunk).
		// -----------------------------------------------------------------
		const applyOptions = (next: FlipOptions): void => {
			options = next;

			if (next.layoutId !== layoutId) {
				layoutId = next.layoutId;
				const restored = layoutId && bridge ? bridge.readLayout(layoutId) : null;
				prevRect = restored ?? measure(element);
			}
		};

		// -----------------------------------------------------------------
		// Initial enter animation (when restored from a shared-layout entry).
		// Attributes are applied *before* the first measure so mounting in the
		// styled state does not animate out of the unstyled one.
		// -----------------------------------------------------------------
		untrack(() => attrs.write(options.class?.(), options.style?.()));
		const initialRect = measure(element);
		if (prevRect) run(prevRect, initialRect);
		prevRect = initialRect;
		observers.connect(element, scheduler.schedule);

		if (typeof input === 'function') {
			$effect(() => {
				applyOptions(input() ?? {});
				scheduler.schedule();
			});
		}

		// Reactive class/style. Reads the options thunk directly rather than the
		// closed-over `options` (a plain `let`, not a signal) so a changed
		// class/style thunk identity is picked up without extra bookkeeping.
		$effect(() => {
			const current = typeof input === 'function' ? readOptions(input) : options;
			const classValue = current.class?.();
			const styleValue = current.style?.();
			// Write and measure untracked — reflow() reads geometry and reassigns
			// state that must not become a dependency of this effect.
			untrack(() => {
				if (attrs.write(classValue, styleValue)) reflow();
			});
		});

		// -----------------------------------------------------------------
		// Teardown — cancel scheduler/observers and write layout for handoff.
		// -----------------------------------------------------------------
		return () => {
			scheduler.cancel();
			observers.disconnect();
			if (layoutId && bridge && prevRect) bridge.writeLayout(layoutId, prevRect);
			slot.cancel();
			attrs.reset();
		};
	};
};
