/**
 * Tests for createObserverManager().
 * In non-DOM environments (node), ResizeObserver and MutationObserver are
 * undefined — connect() is a safe no-op, and disconnect() is idempotent.
 * Runs in the `server` vitest project.
 */

import { describe, expect, it, vi } from 'vitest';
import { createObserverManager } from './observers';

const fakeEl = {
	parentElement: null
} as unknown as Element;

const noop = (): void => {};

describe('createObserverManager() — non-DOM environment', () => {
	it('returns an object with connect and disconnect', () => {
		const obs = createObserverManager();
		expect(typeof obs.connect).toBe('function');
		expect(typeof obs.disconnect).toBe('function');
	});

	it('connect() does not throw when observers are unavailable', () => {
		const obs = createObserverManager();
		expect(() => obs.connect(fakeEl, noop)).not.toThrow();
	});

	it('disconnect() does not throw before connect()', () => {
		const obs = createObserverManager();
		expect(() => obs.disconnect()).not.toThrow();
	});

	it('disconnect() is idempotent', () => {
		const obs = createObserverManager();
		obs.connect(fakeEl, noop);
		expect(() => {
			obs.disconnect();
			obs.disconnect();
		}).not.toThrow();
	});

	it('re-connect() after disconnect() does not throw', () => {
		const obs = createObserverManager();
		obs.connect(fakeEl, noop);
		obs.disconnect();
		expect(() => obs.connect(fakeEl, noop)).not.toThrow();
	});
});

describe('createObserverManager() — with mocked observers', () => {
	it('calls ResizeObserver.observe when available', () => {
		const observe = vi.fn();
		const disconnect = vi.fn();
		const constructorCalls: unknown[][] = [];
		class MockResizeObserver {
			observe = observe;
			disconnect = disconnect;
			constructor(...args: unknown[]) {
				constructorCalls.push(args);
			}
		}
		const origRO = (globalThis as Record<string, unknown>).ResizeObserver;
		(globalThis as Record<string, unknown>).ResizeObserver = MockResizeObserver;

		const obs = createObserverManager();
		obs.connect(fakeEl, vi.fn());

		expect(constructorCalls).toHaveLength(1);
		expect(observe).toHaveBeenCalledWith(fakeEl);

		(globalThis as Record<string, unknown>).ResizeObserver = origRO;
	});

	it('disconnect() calls ResizeObserver.disconnect', () => {
		const roDisconnect = vi.fn();
		class MockResizeObserver {
			observe = vi.fn();
			disconnect = roDisconnect;
			constructor() {}
		}
		const origRO = (globalThis as Record<string, unknown>).ResizeObserver;
		(globalThis as Record<string, unknown>).ResizeObserver = MockResizeObserver;

		const obs = createObserverManager();
		obs.connect(fakeEl, vi.fn());
		obs.disconnect();

		expect(roDisconnect).toHaveBeenCalledOnce();

		(globalThis as Record<string, unknown>).ResizeObserver = origRO;
	});

	it('re-connecting drops the previous element’s observers', () => {
		const roDisconnect = vi.fn();
		const observe = vi.fn();
		class MockResizeObserver {
			observe = observe;
			disconnect = roDisconnect;
			constructor() {}
		}
		const origRO = (globalThis as Record<string, unknown>).ResizeObserver;
		(globalThis as Record<string, unknown>).ResizeObserver = MockResizeObserver;

		const other = { parentElement: null } as unknown as Element;
		const obs = createObserverManager();
		obs.connect(fakeEl, vi.fn());
		obs.connect(other, vi.fn());

		expect(roDisconnect).toHaveBeenCalledOnce();
		expect(observe).toHaveBeenNthCalledWith(2, other);

		(globalThis as Record<string, unknown>).ResizeObserver = origRO;
	});

	it('calls MutationObserver.observe on the parent element when available', () => {
		const moObserve = vi.fn();
		const moDisconnect = vi.fn();
		class MockMutationObserver {
			observe = moObserve;
			disconnect = moDisconnect;
			constructor() {}
		}
		const origMO = (globalThis as Record<string, unknown>).MutationObserver;
		(globalThis as Record<string, unknown>).MutationObserver = MockMutationObserver;

		const parent = { parentElement: null } as unknown as Element;
		const elWithParent = { parentElement: parent } as unknown as Element;

		const obs = createObserverManager();
		obs.connect(elWithParent, vi.fn());

		expect(moObserve).toHaveBeenCalledWith(parent, {
			childList: true,
			subtree: false
		});

		(globalThis as Record<string, unknown>).MutationObserver = origMO;
	});
});
