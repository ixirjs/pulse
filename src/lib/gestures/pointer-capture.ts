/**
 * Pointer-capture helpers that never throw.
 *
 * `setPointerCapture` / `releasePointerCapture` raise `NotFoundError` when the
 * pointer id is not active (common with synthetic events in tests, and with
 * pointers that ended out of order). These wrappers swallow that so gesture
 * teardown is always safe.
 */

export const capture = (element: Element, pointerId: number): void => {
	try {
		element.setPointerCapture(pointerId);
	} catch {
		// Pointer not active — capture is best-effort.
	}
};

export const release = (element: Element, pointerId: number): void => {
	try {
		if (element.hasPointerCapture(pointerId)) {
			element.releasePointerCapture(pointerId);
		}
	} catch {
		// Already released or never captured.
	}
};
