import { afterEach, describe, expect, it, vi } from 'vitest';
import { frameTween } from './frame-tween';

type Queue = Map<number, FrameRequestCallback>;

const installFrames = (): { queue: Queue; flush: (time: number) => void } => {
	let id = 0;
	const queue: Queue = new Map();
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		queue.set(++id, callback);
		return id;
	});
	vi.stubGlobal('cancelAnimationFrame', (handle: number) => queue.delete(handle));
	return {
		queue,
		flush(time) {
			const next = queue.entries().next().value as [number, FrameRequestCallback] | undefined;
			if (!next) throw new Error('No frame is scheduled');
			queue.delete(next[0]);
			next[1](time);
		}
	};
};

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('frameTween()', () => {
	it('renders an optional initial sample and completes exactly once', async () => {
		const { flush } = installFrames();
		const samples: number[] = [];
		const complete = vi.fn();
		const tween = frameTween({
			duration: 100,
			delay: 20,
			renderInitial: true,
			onFrame: (progress) => samples.push(progress),
			onComplete: complete
		});

		expect(samples).toEqual([0]);
		flush(100); // Establishes the delay window.
		flush(120);
		flush(170);
		flush(220);
		await tween.finished;

		expect(samples).toEqual([0, 0, 0.5, 1]);
		expect(complete).toHaveBeenCalledOnce();
	});

	it('holds progress at 0 until the delay window elapses', () => {
		const { flush } = installFrames();
		const samples: number[] = [];
		frameTween({
			duration: 100,
			delay: 50,
			onFrame: (progress) => samples.push(progress)
		});

		flush(100); // Establishes the delay window.
		flush(120);
		flush(150);
		expect(samples).toEqual([0]);
	});

	it('cancels pending work without a terminal sample or completion callback', async () => {
		const { queue } = installFrames();
		const complete = vi.fn();
		const tween = frameTween({
			duration: 100,
			delay: 0,
			onFrame: vi.fn(),
			onComplete: complete
		});

		tween.cancel();
		tween.cancel();
		await tween.finished;
		expect(queue).toHaveLength(0);
		expect(complete).not.toHaveBeenCalled();
	});
});
