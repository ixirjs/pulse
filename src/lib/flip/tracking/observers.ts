/**
 * Auto-tracking observers.
 *
 * Wraps a `ResizeObserver` on the element plus a `MutationObserver` on its
 * parent (sibling reorder/insertion/removal) into a single connect/disconnect
 * pair. Connection is idempotent, and re-`connect()`ing rewires to the
 * current parent (handy when the element is reparented).
 */

export interface LayoutObservers {
  connect: () => void;
  disconnect: () => void;
}

interface LayoutObserverArgs {
  element: Element;
  onChange: () => void;
}

export const createLayoutObservers = ({
  element,
  onChange,
}: LayoutObserverArgs): LayoutObservers => {
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;

  const disconnect = (): void => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    mutationObserver?.disconnect();
    mutationObserver = null;
  };

  const connect = (): void => {
    disconnect();

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(onChange);
      resizeObserver.observe(element);
    }

    const parent = element.parentElement;
    if (parent && typeof MutationObserver === "function") {
      mutationObserver = new MutationObserver(onChange);
      mutationObserver.observe(parent, { childList: true, subtree: false });
    }
  };

  return { connect, disconnect };
};
