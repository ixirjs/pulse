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
import { isBrowser } from '../../shared/browser';
import { createFrameBatch } from '../../shared/frame-batch';
import type { LayoutBridge } from './bridge';
import { createControllerSlot } from '../animation/controller-slot';
import { measure, measureVisual, rectsEqual } from '../geometry';
import type { ObserverManager } from '../tracking/observers';
import { readOptions } from '../options';
import type { FlipAuto, FlipOptions, FlipOptionsInput, FlipRect, MotionElement } from '../types';

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
		let auto: FlipAuto | undefined = options.auto;
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
			const render = renderCount++;
			const { skip } = options;
			const shouldSkip =
				typeof skip === 'function' ? skip(render, { from: prevRect, to: next }) : (skip ?? false);
			if (shouldSkip || rectsEqual(prevRect, next)) {
				prevRect = next;
				return;
			}
			// Interrupting an in-flight FLIP: start from the element's live on-screen
			// rect (transform included) so the replacement run continues from where it
			// visually is, instead of snapping back to its resting box first. When idle
			// the element already sits at its new resting box, so the captured `from`
			// must be the previous rect to produce any movement.
			const from = slot.isActive() ? measureVisual(element) : prevRect;
			prevRect = next;
			run(from, next);
		};

		const scheduler = createFrameBatch(reflow);
		let connectedManager: ObserverManager | null = null;

		const syncObservers = (): void => {
			connectedManager?.disconnect();
			connectedManager = null;
			if (typeof auto === 'object') {
				auto.connect(element, scheduler.schedule);
				connectedManager = auto;
			}
		};

		// -----------------------------------------------------------------
		// Track option changes (when caller passes a thunk).
		// -----------------------------------------------------------------
		let autoEffectVersion = $state(0);

		const applyOptions = (next: FlipOptions): void => {
			const autoChanged = next.auto !== auto;

			options = next;

			if (next.layoutId !== layoutId) {
				layoutId = next.layoutId;
				const restored = layoutId && bridge ? bridge.readLayout(layoutId) : null;
				prevRect = restored ?? measure(element);
			}

			if (autoChanged) {
				auto = next.auto;
				// Use untrack so the read of autoEffectVersion is not registered as a
				// dependency of the enclosing $effect. Without this, `+= 1` would both
				// read *and* write the signal inside the same effect, causing Svelte to
				// immediately re-schedule the effect and loop until depth is exceeded.
				autoEffectVersion = untrack(() => autoEffectVersion) + 1;
				syncObservers();
			}
		};

		// -----------------------------------------------------------------
		// Initial enter animation (when restored from a shared-layout entry).
		// -----------------------------------------------------------------
		const initialRect = measure(element);
		if (prevRect) run(prevRect, initialRect);
		prevRect = initialRect;
		syncObservers();

		if (typeof input === 'function') {
			$effect(() => {
				applyOptions(input() ?? {});
				scheduler.schedule();
			});
		}

		// Re-run the user's auto thunk whenever its tracked dependencies change.
		$effect(() => {
			void autoEffectVersion;
			const trigger = options.auto;
			if (typeof trigger !== 'function') return;
			trigger();
			scheduler.schedule();
		});

		// -----------------------------------------------------------------
		// Teardown — cancel scheduler/observers and write layout for handoff.
		// -----------------------------------------------------------------
		return () => {
			scheduler.cancel();
			connectedManager?.disconnect();
			if (layoutId && bridge && prevRect) bridge.writeLayout(layoutId, prevRect);
			slot.cancel();
		};
	};
};
