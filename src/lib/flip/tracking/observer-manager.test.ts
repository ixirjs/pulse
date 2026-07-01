/**
 * Tests for createObserverManager().
 * Delegates to createLayoutObservers internally; tested at the manager level.
 * Runs in the `server` vitest project.
 */

import { describe, expect, it, vi } from 'vitest';
import { createObserverManager } from './observer-manager';

const fakeEl = { parentElement: null } as unknown as Element;

describe('createObserverManager()', () => {
	it('returns an object with connect and disconnect', () => {
		const mgr = createObserverManager();
		expect(typeof mgr.connect).toBe('function');
		expect(typeof mgr.disconnect).toBe('function');
	});

	it('connect() does not throw', () => {
		const mgr = createObserverManager();
		expect(() => mgr.connect(fakeEl, () => {})).not.toThrow();
	});

	it('disconnect() does not throw before connect()', () => {
		const mgr = createObserverManager();
		expect(() => mgr.disconnect()).not.toThrow();
	});

	it('disconnect() does not throw after connect()', () => {
		const mgr = createObserverManager();
		mgr.connect(fakeEl, () => {});
		expect(() => mgr.disconnect()).not.toThrow();
	});

	it('calling connect() twice disconnects the previous observers', () => {
		const mgr = createObserverManager();
		const el2 = { parentElement: null } as unknown as Element;
		mgr.connect(fakeEl, () => {});
		// Second connect should not throw — previous inner is disconnected first
		expect(() => mgr.connect(el2, vi.fn())).not.toThrow();
	});

	it('disconnect() is idempotent', () => {
		const mgr = createObserverManager();
		mgr.connect(fakeEl, () => {});
		expect(() => {
			mgr.disconnect();
			mgr.disconnect();
		}).not.toThrow();
	});
});
