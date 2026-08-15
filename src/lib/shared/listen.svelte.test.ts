import { describe, expect, it, vi } from 'vitest';
import { listen } from './listen';

describe('listen()', () => {
	it('attaches every handler and detaches exactly those on teardown', () => {
		const target = document.createElement('div');
		const down = vi.fn();
		const up = vi.fn();

		const unlisten = listen(target, { pointerdown: down, pointerup: up });
		target.dispatchEvent(new Event('pointerdown'));
		target.dispatchEvent(new Event('pointerup'));
		expect(down).toHaveBeenCalledTimes(1);
		expect(up).toHaveBeenCalledTimes(1);

		unlisten();
		target.dispatchEvent(new Event('pointerdown'));
		target.dispatchEvent(new Event('pointerup'));
		expect(down).toHaveBeenCalledTimes(1);
		expect(up).toHaveBeenCalledTimes(1);
	});

	it('forwards listener options so teardown matches the capture phase', () => {
		const target = document.createElement('div');
		const child = target.appendChild(document.createElement('span'));
		const handler = vi.fn();

		const unlisten = listen(target, { click: handler }, { capture: true });
		child.dispatchEvent(new Event('click', { bubbles: true }));
		expect(handler).toHaveBeenCalledTimes(1);

		unlisten();
		child.dispatchEvent(new Event('click', { bubbles: true }));
		expect(handler).toHaveBeenCalledTimes(1);
	});
});
