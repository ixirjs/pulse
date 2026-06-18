/**
 * Layout bridge for shared-element transitions.
 *
 * Stores the last-known rect for a `layoutId` with a TTL so a sibling
 * mounting just after another unmounts can read the position without
 * incurring a global registry.
 */

import type { FlipRect } from "../types";

interface LayoutRecord {
  rect: FlipRect;
  timestamp: number;
}

export interface LayoutBridge {
  readLayout: (id: string) => FlipRect | null;
  writeLayout: (id: string, rect: FlipRect) => void;
}

export interface LayoutBridgeHandle {
  bridge: LayoutBridge;
  /** Drop every stored rect — useful between routes or in tests. */
  clear: () => void;
}

/** Default lifetime of an unread layout record, in ms. */
const DEFAULT_LAYOUT_TTL_MS = 250;

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

/**
 * Create an in-memory layout registry exposing the {@link LayoutBridge}
 * interface plus a `clear()` escape hatch.
 *
 * @param ttlMs   How long an unread record stays valid. Defaults to
 *                {@link DEFAULT_LAYOUT_TTL_MS}.
 */
export const createLayoutBridge = (ttlMs?: number): LayoutBridgeHandle => {
  const ttl = ttlMs ?? DEFAULT_LAYOUT_TTL_MS;
  const registry = new Map<string, LayoutRecord>();

  const bridge: LayoutBridge = {
    writeLayout: (id, rect) => {
      registry.set(id, { rect, timestamp: now() });
    },
    readLayout: (id) => {
      const entry = registry.get(id);
      if (!entry) return null;
      if (now() - entry.timestamp > ttl) {
        registry.delete(id);
        return null;
      }
      return entry.rect;
    },
  };

  return {
    bridge,
    clear: () => registry.clear(),
  };
};
