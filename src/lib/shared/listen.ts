/**
 * Typed `addEventListener` bundle.
 *
 * Every gesture attachment wires a handful of DOM events and must tear down
 * exactly the same set. Doing that by hand costs a cast per handler (the
 * `HTMLElementEventMap` value type never matches `EventListener`) and a
 * mirrored `removeEventListener` per handler that can silently drift from the
 * add side. `listen()` owns both halves: pass a map of handlers, get the
 * teardown back.
 */

/** Handlers keyed by DOM event name, each typed to its own event. */
export type EventHandlers = {
	[K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void;
};

/**
 * Attach every handler in `handlers` to `target`, and return the function that
 * detaches exactly those handlers.
 */
export const listen = (
	target: EventTarget,
	handlers: EventHandlers,
	options?: AddEventListenerOptions
): (() => void) => {
	const entries = Object.entries(handlers) as [string, EventListener][];
	for (const [type, handler] of entries) target.addEventListener(type, handler, options);
	return () => {
		for (const [type, handler] of entries) target.removeEventListener(type, handler, options);
	};
};
