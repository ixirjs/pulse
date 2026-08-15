/**
 * `viewTransitionName()` — a Svelte attachment that tags an element with a
 * `view-transition-name` so it participates as a shared element in a
 * {@link viewTransition}. Mirrors the ergonomics of `flip({ layoutId })`.
 */

import type { Attachment } from 'svelte/attachments';
import { isBrowser } from '../shared/browser';
import type { MotionElement } from '../shared/types';

/** A static name, or a thunk read reactively so the name can track `$state`. */
export type ViewTransitionNameInput = string | (() => string | undefined);

/**
 * Assign a `view-transition-name` to an element. Pass a thunk for a reactive
 * name; it re-applies whenever its tracked dependencies change and is removed
 * on teardown.
 *
 * Each name must be unique among rendered elements at snapshot time.
 *
 * @example
 * ```svelte
 * <img {@attach viewTransitionName('hero')} />
 * <li {@attach viewTransitionName(() => `item-${id}`)}>…</li>
 * ```
 */
export const viewTransitionName = <T extends MotionElement>(
	name: ViewTransitionNameInput
): Attachment<T> => {
	return (element) => {
		if (!isBrowser()) return;

		const apply = (value: string | undefined): void => {
			if (value) element.style.setProperty('view-transition-name', value);
			else element.style.removeProperty('view-transition-name');
		};

		if (typeof name === 'function') {
			$effect(() => apply(name()));
		} else {
			apply(name);
		}

		return () => element.style.removeProperty('view-transition-name');
	};
};
