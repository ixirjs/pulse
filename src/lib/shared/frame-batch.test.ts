import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFrameBatch } from './frame-batch';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('createFrameBatch()', () => {
	it('coalesces independent subscribers into one browser frame', () => {
		let frame: FrameRequestCallback | undefined;
		const request = vi.fn((callback: FrameRequestCallback) => {
			frame = callback;
			return 1;
		});
		vi.stubGlobal('requestAnimationFrame', request);
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
		const first = vi.fn();
		const second = vi.fn();
		const a = createFrameBatch(first);
		const b = createFrameBatch(second);

		a.schedule();
		b.schedule();
		a.schedule();
		expect(request).toHaveBeenCalledOnce();

		frame!(0);
		expect(first).toHaveBeenCalledOnce();
		expect(second).toHaveBeenCalledOnce();
	});

	it('removes a cancelled subscriber without cancelling other work', () => {
		let frame: FrameRequestCallback | undefined;
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			frame = callback;
			return 7;
		});
		const cancel = vi.fn();
		vi.stubGlobal('cancelAnimationFrame', cancel);
		const first = vi.fn();
		const second = vi.fn();
		const a = createFrameBatch(first);
		const b = createFrameBatch(second);

		a.schedule();
		b.schedule();
		a.cancel();
		frame!(0);

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledOnce();
		expect(cancel).not.toHaveBeenCalled();
	});
});
