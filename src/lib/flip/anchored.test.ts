import { describe, expect, it, vi } from 'vitest';
import { anchoredFlip } from './index';

describe('anchoredFlip() — non-browser environment', () => {
	it('does not read state or geometry during SSR', () => {
		const isOpen = vi.fn(() => true);
		const getReference = vi.fn(() => null);
		const transition = anchoredFlip(isOpen, getReference);

		expect(() => transition({} as HTMLElement)).not.toThrow();
		expect(isOpen).not.toHaveBeenCalled();
		expect(getReference).not.toHaveBeenCalled();
	});
});
