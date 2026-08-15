/**
 * Auto-tracking observers.
 *
 * Wraps a `ResizeObserver` on the element plus a `MutationObserver` on its
 * parent (sibling reorder/insertion/removal) behind one connect/disconnect
 * pair. `connect()` is idempotent and rewires to the element's current parent,
 * so re-connecting after a reparent (or with a different element) is safe.
 */

export interface ObserverManager {
	connect: (element: Element, onChange: () => void) => void;
	disconnect: () => void;
}

export const createObserverManager = (): ObserverManager => {
	let resizeObserver: ResizeObserver | null = null;
	let mutationObserver: MutationObserver | null = null;

	const disconnect = (): void => {
		resizeObserver?.disconnect();
		resizeObserver = null;
		mutationObserver?.disconnect();
		mutationObserver = null;
	};

	return {
		disconnect,
		connect(element, onChange) {
			disconnect();

			if (typeof ResizeObserver === 'function') {
				resizeObserver = new ResizeObserver(onChange);
				resizeObserver.observe(element);
			}

			const parent = element.parentElement;
			if (parent && typeof MutationObserver === 'function') {
				mutationObserver = new MutationObserver(onChange);
				mutationObserver.observe(parent, { childList: true, subtree: false });
			}
		}
	};
};
