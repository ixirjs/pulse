/**
 * Tests for the shared-layout bridge.
 * Pure in-memory registry — runs in the `server` vitest project.
 */

import { describe, expect, it, vi } from 'vitest';
import { createLayoutBridge } from './bridge';
import type { FlipRect } from '../types';

const rect = (x = 0, y = 0, w = 100, h = 50): FlipRect => ({
	x,
	y,
	width: w,
	height: h
});

describe('createLayoutBridge()', () => {
	it('returns a read/write pair', () => {
		const bridge = createLayoutBridge();
		expect(typeof bridge.writeLayout).toBe('function');
		expect(typeof bridge.readLayout).toBe('function');
	});

	it('readLayout returns null for an unknown id', () => {
		const bridge = createLayoutBridge();
		expect(bridge.readLayout('unknown')).toBeNull();
	});

	it('writeLayout + readLayout round-trips the rect', () => {
		const bridge = createLayoutBridge();
		const r = rect(10, 20, 300, 150);
		bridge.writeLayout('hero', r);
		expect(bridge.readLayout('hero')).toEqual(r);
	});

	it('readLayout returns the rect while still within the 250ms TTL', () => {
		vi.useFakeTimers();
		const bridge = createLayoutBridge();
		bridge.writeLayout('card', rect(1, 2, 3, 4));
		vi.advanceTimersByTime(200);
		expect(bridge.readLayout('card')).toEqual(rect(1, 2, 3, 4));
		vi.useRealTimers();
	});

	it('readLayout deletes the entry once the TTL has passed', () => {
		vi.useFakeTimers();
		const bridge = createLayoutBridge();
		bridge.writeLayout('card', rect());
		vi.advanceTimersByTime(251);
		expect(bridge.readLayout('card')).toBeNull();
		vi.useRealTimers();
	});

	it('writeLayout overwrites a previously stored rect', () => {
		const bridge = createLayoutBridge();
		bridge.writeLayout('id', rect(0, 0, 100, 50));
		const newer = rect(99, 99, 200, 200);
		bridge.writeLayout('id', newer);
		expect(bridge.readLayout('id')).toEqual(newer);
	});

	it('separate bridges are independent', () => {
		const a = createLayoutBridge();
		const b = createLayoutBridge();
		a.writeLayout('shared', rect(1, 2, 3, 4));
		expect(b.readLayout('shared')).toBeNull();
	});
});
