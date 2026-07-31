/**
 * Wraps a native `ViewTransition` in the library's uniform
 * {@link AnimationController} interface.
 *
 * The trick: don't recompute geometry. After `transition.ready`, the
 * browser has already created CSS animations on the `::view-transition-*`
 * pseudo-elements with the correct old→new transforms. We collect those real
 * `Animation` objects, optionally re-time them with a spring/custom easing, and
 * expose them through the same `seek`/`pause`/`reverse`/`finished` surface every
 * other feature returns — so a spring-eased view transition is still fully
 * controllable.
 */

import type { AnimationController } from '../animate/types';
import { resolveViewTransitionTiming } from './timing';
import type { ViewTransitionOptions } from './types';

const NOOP = (): void => {};
const EMPTY_ANIMATIONS: readonly Animation[] = Object.freeze([]);

/** Collect the live pseudo-element animations for the running transition. */
const collectPseudoAnimations = (names?: readonly string[]): Animation[] =>
	document.getAnimations().filter((animation) => {
		const effect = animation.effect;
		if (!(effect instanceof KeyframeEffect)) return false;
		const pseudo = effect.pseudoElement;
		if (!pseudo?.startsWith('::view-transition')) return false;
		// `::view-transition-group(name)` etc. — match the name inside the parens.
		return !names?.length || names.some((name) => pseudo.includes(`(${name})`));
	});

/**
 * Build an {@link AnimationController} backed by a running view transition.
 *
 * The control methods operate on the pseudo-element animations, which exist
 * only after `transition.ready` resolves; before then `animations` is empty and
 * `pause`/`seek`/etc. are no-ops. `cancel()` and `stop()` skip the transition
 * (jump to the end state) and take effect immediately.
 */
export const createViewTransitionController = (
	transition: ViewTransition,
	options: ViewTransitionOptions
): AnimationController => {
	let animations: readonly Animation[] = EMPTY_ANIMATIONS;
	const timing = resolveViewTransitionTiming(options);

	const forEachAnim = (fn: (a: Animation) => void): void => {
		for (const anim of animations) fn(anim);
	};

	transition.ready
		.then(() => {
			animations = collectPseudoAnimations(options.names);
			if (timing) {
				for (const anim of animations) {
					// Animation may already be finishing on a fast transition — ignore.
					try {
						anim.effect?.updateTiming(timing);
					} catch {
						/* no-op */
					}
				}
			}
			options.onReady?.();
		})
		// `ready` rejects when the transition is skipped before it starts; there's
		// simply nothing to ease in that case.
		.catch(NOOP);

	// Prevent an unhandled rejection if the update callback throws — the
	// transition is skipped and the DOM is left as-is.
	transition.updateCallbackDone.catch(NOOP);

	// `finished` resolves on normal completion *and* on skip/cancel (the
	// transition always settles to the end state), so map both to void.
	const finished = transition.finished.then(NOOP, NOOP);

	const skip = (): void => transition.skipTransition();

	return {
		get animations() {
			return animations;
		},
		finished,
		get currentTime(): number | null {
			const t = animations[0]?.currentTime;
			return typeof t === 'number' ? t : null;
		},
		get playbackRate(): number {
			return animations[0]?.playbackRate ?? 1;
		},
		set playbackRate(rate: number) {
			forEachAnim((a) => (a.playbackRate = rate));
		},
		cancel: () => {
			skip();
			forEachAnim((a) => a.cancel());
		},
		// View-transition pseudo-elements are ephemeral, so there is no inline
		// state to commit — `stop()` finishes the morph immediately, like `cancel`
		// minus the hard reset.
		stop: skip,
		pause: () => forEachAnim((a) => a.pause()),
		play: () => forEachAnim((a) => a.play()),
		reverse: () => forEachAnim((a) => a.reverse()),
		seek: (timeMs: number) =>
			forEachAnim((a) => {
				try {
					a.currentTime = timeMs;
				} catch {
					/* animation may have been cancelled — ignore */
				}
			})
	};
};

/**
 * A pre-settled controller for the no-transition paths (SSR, unsupported
 * browser, reduced motion). `finished` tracks the update callback so callers
 * can still `await` it.
 */
export const resolvedController = (finished: Promise<void>): AnimationController => ({
	animations: EMPTY_ANIMATIONS,
	finished,
	currentTime: null,
	playbackRate: 1,
	cancel: NOOP,
	stop: NOOP,
	pause: NOOP,
	play: NOOP,
	reverse: NOOP,
	seek: NOOP
});
