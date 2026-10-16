/**
 * timeline() playback in a real browser: call/set entries follow the
 * timeline clock. Runs in the `client` project.
 */

import { describe, expect, it, vi } from 'vitest';
import { timeline } from './timeline';

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('timeline() call/set entries', () => {
	it('hold while paused and fire on resume', async () => {
		const fn = vi.fn();
		const tl = timeline().call(fn, 40);
		tl.play();
		tl.pause();
		await wait(100);
		expect(fn).not.toHaveBeenCalled();
		tl.play();
		await vi.waitFor(() => expect(fn).toHaveBeenCalledOnce());
	});

	it('are included in finished', async () => {
		const fn = vi.fn();
		await timeline().call(fn, 40).finished;
		expect(fn).toHaveBeenCalledOnce();
	});

	it('are skipped when reversed before being reached', async () => {
		const fn = vi.fn();
		const tl = timeline({ paused: true }).call(fn, 100).play();
		tl.reverse();
		await tl.finished;
		await wait(150);
		expect(fn).not.toHaveBeenCalled();
	});

	it('do not leak into animations', () => {
		const tl = timeline({ paused: true }).call(() => {}, 40);
		expect(tl.animations).toHaveLength(0);
		tl.cancel();
	});
});
