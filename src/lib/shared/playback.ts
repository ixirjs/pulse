/**
 * The WAAPI transport controls shared by every `AnimationController`.
 *
 * Both controllers (the `animate()` one and the view-transition one) drive a
 * *group* of `Animation` objects that share a clock, so pause/play/reverse/seek
 * are the same fan-out in both. Keeping the implementation here stops the two
 * from drifting — particularly `seek`, which must swallow the throw from
 * setting `currentTime` on an already-cancelled animation.
 *
 * DOM-typed but framework-free, so either package can import it without
 * pulling in the other.
 */

/** The subset of `AnimationController` that is pure fan-out over the group. */
export interface PlaybackControls {
	pause(): void;
	play(): void;
	reverse(): void;
	seek(timeMs: number): void;
}

/** Build the transport controls for a group visited by `forEachAnim`. */
export const playbackControls = (
	forEachAnim: (fn: (animation: Animation) => void) => void
): PlaybackControls => ({
	pause: () => forEachAnim((a) => a.pause()),
	play: () => forEachAnim((a) => a.play()),
	reverse: () => forEachAnim((a) => a.reverse()),
	seek: (timeMs: number) =>
		forEachAnim((a) => {
			try {
				a.currentTime = timeMs;
			} catch {
				// Animation may have been cancelled — ignore.
			}
		})
});
