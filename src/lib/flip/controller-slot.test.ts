/**
 * Tests for createControllerSlot() — the single-slot FLIP controller holder
 * shared by the attachment and the switcher.
 *
 * `animateFlip` is mocked so the slot's lifecycle orchestration (cancel on
 * re-run, clear-only-on-finish, onEnd forwarding) can be unit-tested in node
 * without a real WAAPI animation.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const { animateFlipMock } = vi.hoisted(() => ({ animateFlipMock: vi.fn() }));
vi.mock('./animator', () => ({ animateFlip: animateFlipMock }));

import { createControllerSlot } from './controller-slot';
import type { FlipAnimateArgs, FlipRect, FlipRectPair } from './types';

const rect = (x = 0, y = 0): FlipRect => ({ x, y, width: 10, height: 10 });
const rects: FlipRectPair = { from: rect(), to: rect(5, 5) };

const args = (extra: Partial<FlipAnimateArgs> = {}): FlipAnimateArgs => ({
	element: {} as HTMLElement,
	from: rect(),
	to: rect(5, 5),
	options: {},
	...extra
});

/** The controller returned by the most recent animateFlip() call. */
const lastController = () =>
	animateFlipMock.mock.results.at(-1)!.value as { cancel: ReturnType<typeof vi.fn> };

/** The wrapped onEnd the slot handed to the most recent animateFlip() call. */
const lastWrappedOnEnd = () =>
	animateFlipMock.mock.calls.at(-1)![0].options.onEnd as (
		el: Element,
		info: { finished: boolean; rects: FlipRectPair }
	) => void;

beforeEach(() => {
	animateFlipMock.mockReset();
	animateFlipMock.mockImplementation(() => ({ cancel: vi.fn() }));
});

describe('createControllerSlot()', () => {
	it('starts a new FLIP animation on run()', () => {
		createControllerSlot().run(args());
		expect(animateFlipMock).toHaveBeenCalledTimes(1);
	});

	it('forwards non-options args (e.g. forward) through to animateFlip', () => {
		const el = {} as HTMLElement;
		createControllerSlot().run(args({ element: el, forward: true }));
		const passed = animateFlipMock.mock.calls[0]![0];
		expect(passed.element).toBe(el);
		expect(passed.forward).toBe(true);
	});

	it('cancels the in-flight controller when a second run() starts', () => {
		const slot = createControllerSlot();
		slot.run(args());
		const first = lastController();
		slot.run(args());
		expect(first.cancel).toHaveBeenCalledTimes(1);
	});

	it('forwards the wrapped onEnd to the user callback', () => {
		const onEnd = vi.fn();
		createControllerSlot().run(args({ options: { onEnd } }));
		const el = {} as Element;
		const info = { finished: true, rects };
		lastWrappedOnEnd()(el, info);
		expect(onEnd).toHaveBeenCalledWith(el, info);
	});

	it("clears the slot on a natural finish (so teardown won't re-cancel)", () => {
		const slot = createControllerSlot();
		slot.run(args());
		const ctrl = lastController();
		lastWrappedOnEnd()({} as Element, { finished: true, rects });
		slot.cancel();
		// Slot was emptied by the finish, so cancel() has nothing to cancel.
		expect(ctrl.cancel).not.toHaveBeenCalled();
	});

	it('keeps the slot when a run ends as cancelled (finished: false)', () => {
		const slot = createControllerSlot();
		slot.run(args());
		const ctrl = lastController();
		lastWrappedOnEnd()({} as Element, { finished: false, rects });
		slot.cancel();
		expect(ctrl.cancel).toHaveBeenCalledTimes(1);
	});

	it('reports isActive() only while a controller is in flight', () => {
		const slot = createControllerSlot();
		expect(slot.isActive()).toBe(false);
		slot.run(args());
		expect(slot.isActive()).toBe(true);
		// A natural finish clears the slot...
		lastWrappedOnEnd()({} as Element, { finished: true, rects });
		expect(slot.isActive()).toBe(false);
		// ...and so does an explicit cancel().
		slot.run(args());
		expect(slot.isActive()).toBe(true);
		slot.cancel();
		expect(slot.isActive()).toBe(false);
	});

	it('is inactive when animateFlip does no work (returns null)', () => {
		animateFlipMock.mockImplementationOnce(() => null);
		const slot = createControllerSlot();
		slot.run(args());
		expect(slot.isActive()).toBe(false);
	});

	it('empties the slot on cancel() — a second cancel() is a no-op', () => {
		const slot = createControllerSlot();
		slot.run(args());
		const ctrl = lastController();
		slot.cancel();
		slot.cancel();
		expect(ctrl.cancel).toHaveBeenCalledTimes(1);
	});
});

describe('interrupted runs', () => {
	/** Resolve the duration the slot handed to the most recent animateFlip() call. */
	const lastDuration = () => {
		const d = animateFlipMock.mock.calls.at(-1)![0].options.duration;
		return typeof d === 'function' ? d(0, rects) : d;
	};

	it('charges elapsed time against each replacement until it hits the floor', () => {
		animateFlipMock.mockImplementation(() => ({ cancel: vi.fn(), currentTime: 100 }));
		const slot = createControllerSlot();

		slot.run(args({ options: { duration: 400 } }));
		expect(lastDuration()).toBe(400);

		slot.run(args({ options: { duration: 400 } }));
		expect(lastDuration()).toBe(300);

		slot.run(args({ options: { duration: 400 } }));
		expect(lastDuration()).toBe(200);

		slot.run(args({ options: { duration: 400 } }));
		expect(lastDuration()).toBe(120); // floored, not 100

		// A natural finish ends the burst — the next run gets the full duration.
		lastWrappedOnEnd()({} as Element, { finished: true, rects });
		slot.run(args({ options: { duration: 400 } }));
		expect(lastDuration()).toBe(400);
	});
});
