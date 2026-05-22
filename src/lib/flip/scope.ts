/**
 * Public scope factory.
 *
 * Wraps the registry from `bridge.ts` together with the attachment factory
 * so callers get a self-contained shared-layout namespace.
 */

import { createFlipAttachment } from "./attachment.svelte";
import { createLayoutBridge } from "./bridge";
import type {
  CreateFlipScopeOptions,
  FlipOptionsInput,
  FlipScope,
} from "./types";

/**
 * Create an isolated FLIP scope with a shared-layout registry.
 * Use `layoutId` on attachments from the same scope for cross-component
 * shared-element transitions. No global state involved.
 *
 * @example
 * ```ts
 * const { flip } = createFlipScope();
 * ```
 * ```svelte
 * <div {@attach flip({ layoutId: "hero" })}>...</div>
 * ```
 */
export const createFlipScope = (
  opts: CreateFlipScopeOptions = {},
): FlipScope => {
  const { bridge, clear } = createLayoutBridge(opts.layoutTtlMs ?? 250);

  return {
    flip: (input?: FlipOptionsInput) => createFlipAttachment(input, bridge),
    clear,
  };
};
