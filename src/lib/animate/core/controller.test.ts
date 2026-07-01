/**
 * Tests for animation controllers.
 * `noopController` is pure (no DOM) — runs in the `server` vitest project.
 */

import { describe, expect, it, vi } from 'vitest';
import { noopController } from './controller';

const fakeElement = {} as Element;

describe('noopController()', () => {
	it('returns an object with the expected shape', () => {
		const ctrl = noopController(fakeElement, {});
		expect(ctrl).toHaveProperty('animations');
		expect(ctrl).toHaveProperty('finished');
		expect(ctrl).toHaveProperty('currentTime');
		expect(ctrl).toHaveProperty('playbackRate');
		expect(ctrl).toHaveProperty('cancel');
		expect(ctrl).toHaveProperty('stop');
		expect(ctrl).toHaveProperty('pause');
		expect(ctrl).toHaveProperty('play');
		expect(ctrl).toHaveProperty('reverse');
		expect(ctrl).toHaveProperty('seek');
	});

	it('animations is an empty frozen array', () => {
		const ctrl = noopController(fakeElement, {});
		expect(ctrl.animations).toHaveLength(0);
		expect(Object.isFrozen(ctrl.animations)).toBe(true);
	});

	it('finished is a resolved Promise', async () => {
		const ctrl = noopController(fakeElement, {});
		await expect(ctrl.finished).resolves.toBeUndefined();
	});

	it('currentTime is null', () => {
		const ctrl = noopController(fakeElement, {});
		expect(ctrl.currentTime).toBeNull();
	});

	it('playbackRate is 1', () => {
		const ctrl = noopController(fakeElement, {});
		expect(ctrl.playbackRate).toBe(1);
	});

	it('cancel, stop, pause, play, reverse, seek are no-op functions', () => {
		const ctrl = noopController(fakeElement, {});
		expect(() => ctrl.cancel()).not.toThrow();
		expect(() => ctrl.stop()).not.toThrow();
		expect(() => ctrl.pause()).not.toThrow();
		expect(() => ctrl.play()).not.toThrow();
		expect(() => ctrl.reverse()).not.toThrow();
		expect(() => ctrl.seek(0)).not.toThrow();
	});

	it('calls onStart immediately with the element', () => {
		const onStart = vi.fn();
		noopController(fakeElement, { onStart });
		expect(onStart).toHaveBeenCalledOnce();
		expect(onStart).toHaveBeenCalledWith(fakeElement);
	});

	it('calls onEnd immediately with finished: true', () => {
		const onEnd = vi.fn();
		noopController(fakeElement, { onEnd });
		expect(onEnd).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledWith(fakeElement, { finished: true });
	});

	it('works with no callbacks in defaults', () => {
		expect(() => noopController(fakeElement, {})).not.toThrow();
	});

	it('calls both onStart and onEnd in order', () => {
		const calls: string[] = [];
		noopController(fakeElement, {
			onStart: () => calls.push('start'),
			onEnd: () => calls.push('end')
		});
		expect(calls).toEqual(['start', 'end']);
	});
});
