export const isBrowser = (): boolean =>
	typeof window !== 'undefined' && typeof document !== 'undefined';

/** Returns true when reduced motion should suppress animation.
 *  `respectFlag` defaults to `true`, matching `AnimateDefaults.respectReducedMotion`. */
export const shouldReduceMotion = (respectFlag?: boolean): boolean =>
	(respectFlag ?? true) &&
	isBrowser() &&
	typeof window.matchMedia === 'function' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;
