/**
 * Layout bridge for shared-element transitions.
 *
 * Stores the last-known rect for a `layoutId` with a TTL so a sibling
 * mounting just after another unmounts can read the position without
 * incurring a global registry.
 */

import type { FlipRect, LayoutBridge } from "./types";

interface LayoutRecord {
  rect: FlipRect;
  timestamp: number;
}

export interface LayoutBridgeHandle {
  bridge: LayoutBridge;
  /** Drop every stored rect — useful between routes or in tests. */
  clear: () => void;
}

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

/**
 * Create an in-memory layout registry exposing the {@link LayoutBridge}
 * interface plus a `clear()` escape hatch.
 *
 * @param ttlMs   How long an unread record stays valid. Defaults to 250 ms.
 */
export const createLayoutBridge = (ttlMs = 250): LayoutBridgeHandle => {
  const registry = new Map<string, LayoutRecord>();

  const bridge: LayoutBridge = {
    writeLayout: (id, rect) => {
      registry.set(id, { rect, timestamp: now() });
    },
    readLayout: (id) => {
      const entry = registry.get(id);
      if (!entry) return null;
      if (now() - entry.timestamp > ttlMs) {
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
