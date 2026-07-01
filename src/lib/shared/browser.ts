export const isBrowser = (): boolean =>
	typeof window !== 'undefined' && typeof document !== 'undefined';

let reducedMotionQuery: MediaQueryList | null | undefined;

export const prefersReducedMotion = (): boolean => {
	if (reducedMotionQuery === undefined) {
		reducedMotionQuery =
			isBrowser() && typeof window.matchMedia === 'function'
				? window.matchMedia('(prefers-reduced-motion: reduce)')
				: null;
	}
	return reducedMotionQuery?.matches ?? false;
};

/** Returns true when reduced motion should suppress animation.
 *  `respectFlag` defaults to `true`, matching `AnimateDefaults.respectReducedMotion`. */
export const shouldReduceMotion = (respectFlag?: boolean): boolean =>
	(respectFlag ?? true) && prefersReducedMotion();
