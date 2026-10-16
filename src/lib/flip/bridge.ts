/**
 * Layout bridge for shared-element transitions.
 *
 * Stores the last-known rect for a `layoutId` so a sibling mounting just after
 * another unmounts can read the position without incurring a global registry.
 * Records expire after {@link LAYOUT_TTL_MS} — a handoff happens within a frame
 * or two, so anything older is stale by definition.
 */

import type { FlipRect } from './types.js';

interface LayoutRecord {
	rect: FlipRect;
	timestamp: number;
}

export interface LayoutBridge {
	readLayout: (id: string) => FlipRect | null;
	writeLayout: (id: string, rect: FlipRect) => void;
}

/** Lifetime of an unread layout record, in ms. */
const LAYOUT_TTL_MS = 250;

/** Create an in-memory, scope-local layout registry. */
export const createLayoutBridge = (): LayoutBridge => {
	const registry = new Map<string, LayoutRecord>();

	return {
		writeLayout: (id, rect) => {
			const now = performance.now();
			// Re-insert so the Map stays ordered oldest-first, then drop the expired
			// head — ids that never come back (feeds, virtual lists) can't pile up.
			registry.delete(id);
			for (const [key, entry] of registry) {
				if (now - entry.timestamp <= LAYOUT_TTL_MS) break;
				registry.delete(key);
			}
			registry.set(id, { rect, timestamp: now });
		},
		readLayout: (id) => {
			const entry = registry.get(id);
			if (!entry) return null;
			if (performance.now() - entry.timestamp > LAYOUT_TTL_MS) {
				registry.delete(id);
				return null;
			}
			return entry.rect;
		}
	};
};
