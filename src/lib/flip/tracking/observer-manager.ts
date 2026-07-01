import { createLayoutObservers, type LayoutObservers } from './observers';

export interface ObserverManager {
	connect: (element: Element, onChange: () => void) => void;
	disconnect: () => void;
}

export const createObserverManager = (): ObserverManager => {
	let inner: LayoutObservers | null = null;

	return {
		connect(element, onChange) {
			inner?.disconnect();
			inner = createLayoutObservers({ element, onChange });
			inner.connect();
		},
		disconnect() {
			inner?.disconnect();
			inner = null;
		}
	};
};
