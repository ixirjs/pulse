/**
 * Controllers wrap one-or-more WAAPI animations behind a uniform interface
 * and own the lifecycle hooks (`onStart` / `onEnd`) plus inline-style cleanup.
 */

import { isBrowser } from '../../shared/browser.js';
import { demoteFoldedTransforms } from '../properties/properties.js';
import { playbackControls } from '../../shared/playback.js';
import type { AnimateDefaults, AnimationController, MotionElement } from '../types.js';
import type { CssWrite } from '../keyframes/keyframes.js';

const NOOP = (): void => {};
const EMPTY_ANIMATIONS: readonly Animation[] = Object.freeze([]);

export const noopController = (
	element: Element,
	defaults: AnimateDefaults
): AnimationController => {
	defaults.onStart?.(element);
	defaults.onEnd?.(element, { finished: true });
	return {
		animations: EMPTY_ANIMATIONS,
		finished: Promise.resolve(),
		currentTime: null,
		playbackRate: 1,
		cancel: NOOP,
		stop: NOOP,
		pause: NOOP,
		play: NOOP,
		reverse: NOOP,
		seek: NOOP
	};
};

interface ControllerOptions {
	element: MotionElement;
	animations: Animation[];
	defaults: AnimateDefaults;
	finalStyles: ReadonlyArray<CssWrite>;
	restorations: ReadonlyArray<CssWrite>;
	onTeardown?: () => void;
}

const writeStyles = (style: CSSStyleDeclaration, writes: ReadonlyArray<CssWrite>): void => {
	// Single setProperty per write — no intermediate getComputedStyle, no
	// commitStyles(), no allocation per entry. Invalidations within the same
	// micro-task are coalesced by the engine.
	for (const { css, value } of writes) style.setProperty(css, value);
};

const applyFinalStyles = (
	element: MotionElement,
	finalStyles: ReadonlyArray<CssWrite>,
	restorations: ReadonlyArray<CssWrite>
): void => {
	const style = element.style;
	writeStyles(style, finalStyles);
	// Restorations run last so auto-keywords override their measured px values,
	// keeping the element responsive to layout changes.
	writeStyles(style, restorations);
};

/**
 * Snapshot each animated property's *current* computed value as an inline
 * style, freezing an interrupted animation at its on-screen position so the
 * next animation starts from there. `getComputedStyle()` reflects the live
 * WAAPI frame for both standard and registered custom properties, making this
 * reliable where `commitStyles()` is not.
 */
const commitComputedStyles = (
	element: MotionElement,
	finalStyles: ReadonlyArray<CssWrite>
): void => {
	const computed = window.getComputedStyle(element);
	const style = element.style;
	for (const { css } of finalStyles) {
		const val = computed.getPropertyValue(css).trim();
		if (val) style.setProperty(css, val);
	}
};

export const createController = ({
	element,
	animations,
	defaults,
	finalStyles,
	restorations,
	onTeardown
}: ControllerOptions): AnimationController => {
	defaults.onStart?.(element);

	const forEachAnim = (fn: (a: Animation) => void): void => {
		for (const anim of animations) fn(anim);
	};
	const cancelAnimations = (): void => forEachAnim((a) => a.cancel());
	// All timing buckets share the same clock, so the first animation represents
	// the group for currentTime / playbackRate reads.
	const primaryAnimation = animations[0];

	// Optional per-frame progress loop. WAAPI doesn't call JS each frame, so when
	// `onUpdate` is supplied we run our own rAF, reading the live timing progress
	// off the primary animation. Stopped by both finalize() and teardown().
	let rafId = 0;
	const stopRaf = (): void => {
		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = 0;
		}
	};
	const startRaf = (): void => {
		const onUpdate = defaults.onUpdate;
		if (!onUpdate || !isBrowser() || !primaryAnimation) return;
		const tick = (): void => {
			const progress = primaryAnimation.effect?.getComputedTiming().progress ?? 1;
			onUpdate(progress, element);
			// onUpdate may have cancelled/stopped the controller — don't re-arm.
			if (rafId) rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
	};

	let finalized = false;
	/**
	 * Settle on where the animation actually ended. `terminalProgress` is the
	 * primary effect's progress at its end: `1` for a normal run, `0` (or a
	 * fraction) after `reverse`, an even `alternate` count, a negative rate or
	 * fractional iterations, and `null` when the fill doesn't hold the end state.
	 */
	const finalize = (terminalProgress: number | null): void => {
		if (finalized) return;
		finalized = true;
		stopRaf();
		if (terminalProgress === 1) {
			// The common case: the end state is the last keyframe we already
			// computed, so write it directly instead of resolving styles per
			// animation (which commitStyles() would do).
			cancelAnimations();
			applyFinalStyles(element, finalStyles, restorations);
		} else if (terminalProgress !== null && isBrowser()) {
			// Ended somewhere else: freeze what is on screen, like stop().
			demoteFoldedTransforms(element);
			commitComputedStyles(element, finalStyles);
			cancelAnimations();
		} else {
			// fill 'none' / 'backwards': back to the element's own styles.
			cancelAnimations();
		}
		onTeardown?.();
	};

	// Build the aggregate finished promise lazily — many animations are
	// fire-and-forget, and accessing `a.finished` allocates one Promise per
	// underlying Animation which is wasted when the caller never awaits.
	let finishedPromise: Promise<void> | undefined;
	const getFinished = (): Promise<void> => {
		if (finishedPromise) return finishedPromise;
		if (animations.length === 0) return (finishedPromise = Promise.resolve());
		return (finishedPromise = Promise.all(animations.map((a) => a.finished)).then(
			() => {
				// Capture the terminal timing before finalize() cancels the effects.
				// This is 1 for a normal one-shot animation, but correctly preserves
				// alternate/reverse iteration direction.
				const terminalProgress = primaryAnimation?.effect?.getComputedTiming().progress ?? null;
				finalize(terminalProgress);
				// The last rAF can run just before WAAPI reaches its terminal time.
				// Publish the terminal sample explicitly so onUpdate has the same
				// end-state guarantee as the animation controller itself.
				defaults.onUpdate?.(terminalProgress ?? 1, element);
				defaults.onEnd?.(element, { finished: true });
			},
			(err) => {
				// Don't run finalize on cancel — `cancel()` already did. Still fire
				// onEnd so callers get a consistent signal, and rethrow so awaiters
				// can observe the abort.
				defaults.onEnd?.(element, { finished: false });
				throw err;
			}
		));
	};

	const teardown = (): void => {
		stopRaf();
		cancelAnimations();
		// Shares finalize()'s guard: onTeardown releases per-element bookkeeping
		// (transform ownership counts), so running it twice — cancel after finish,
		// or cancel twice — would release a newer animation's share.
		if (finalized) return;
		finalized = true;
		onTeardown?.();
	};

	// Eagerly subscribe so onEnd still fires for fire-and-forget callers; the
	// unhandled-rejection on cancel is suppressed by attaching a no-op .catch.
	getFinished().catch(NOOP);
	startRaf();

	return {
		animations,
		get finished() {
			return getFinished();
		},
		get currentTime(): number | null {
			const t = primaryAnimation?.currentTime;
			return typeof t === 'number' ? t : null;
		},
		get playbackRate(): number {
			return primaryAnimation?.playbackRate ?? 1;
		},
		set playbackRate(rate: number) {
			forEachAnim((a) => (a.playbackRate = rate));
		},
		cancel: teardown,
		stop: () => {
			if (isBrowser()) {
				// `commitComputedStyles` reads the animated custom properties. While
				// folded, those hold their pre-animation values and the live position
				// lives on `translate`/`scale` instead, so hand the animation back to
				// the variable path first — it keeps its current time, so the values
				// read back are the ones on screen.
				demoteFoldedTransforms(element);
				commitComputedStyles(element, finalStyles);
			}
			teardown();
		},
		...playbackControls(forEachAnim)
	};
};
