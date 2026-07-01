/**
 * `animateGradient()` — tween between two CSS `linear-gradient` backgrounds.
 *
 * WAAPI cannot interpolate `background-image`, so this runs its own rAF loop:
 * it parses both gradients, resolves colour keywords through a canvas (so
 * `"rebeccapurple"`, `currentColor`-resolved values, etc. all work), and writes
 * an interpolated gradient string each frame. Best results when both gradients
 * share the same number of colour stops; otherwise it snaps to the target.
 *
 * @example
 * ```ts
 * animateGradient(
 *   el,
 *   'linear-gradient(90deg, #f00 0%, #00f 100%)',
 *   'linear-gradient(180deg, #0f0 0%, #ff0 100%)',
 *   { duration: 600 },
 * );
 * ```
 */

import { isBrowser } from '$lib/shared/browser';
import { easeOut } from '$lib/easing';
import type { EasingFn } from '$lib/shared/types';
import {
	formatLinearGradient,
	lerp,
	lerpRGBA,
	parseLinearGradient,
	parseRGBA,
	resolvePositions,
	type RGBA
} from './parse';

export interface GradientOptions {
	/** Duration in ms. Default 400. */
	duration?: number;
	/** Easing function. Default ease-out. */
	easing?: EasingFn;
	/** Delay before starting (ms). Default 0. */
	delay?: number;
	/** CSS property to write. Default `'background-image'`. */
	property?: string;
	/** Called once when the tween settles. */
	onComplete?: () => void;
}

export interface GradientController {
	/** Resolves when the tween settles (or is cancelled). */
	readonly finished: Promise<void>;
	/** Stop the tween where it is. */
	cancel(): void;
}

let canvasCtx: CanvasRenderingContext2D | null | undefined;

/** Resolve any CSS colour (named, hex, rgb, hsl) to normalized RGBA via canvas. */
const resolveColor = (color: string): RGBA => {
	if (canvasCtx === undefined) {
		canvasCtx = document.createElement('canvas').getContext('2d');
	}
	if (!canvasCtx) return parseRGBA(color);
	canvasCtx.fillStyle = '#000';
	canvasCtx.fillStyle = color;
	return parseRGBA(canvasCtx.fillStyle);
};

interface Resolved {
	angle: number;
	colors: RGBA[];
	positions: number[];
}

const resolve = (gradient: string): Resolved => {
	const { angle, stops } = parseLinearGradient(gradient);
	return {
		angle,
		colors: stops.map((s) => resolveColor(s.color)),
		positions: resolvePositions(stops)
	};
};

/** Animate `element` from one linear-gradient to another. */
export const animateGradient = (
	element: HTMLElement | SVGElement,
	from: string,
	to: string,
	options: GradientOptions = {}
): GradientController => {
	const {
		duration = 400,
		easing = easeOut,
		delay = 0,
		property = 'background-image',
		onComplete
	} = options;

	let resolveFinished!: () => void;
	const finished = new Promise<void>((res) => (resolveFinished = res));

	if (!isBrowser()) {
		resolveFinished();
		return { finished, cancel: () => {} };
	}

	const a = resolve(from);
	const b = resolve(to);
	const write = (value: string): void => element.style.setProperty(property, value);

	// Mismatched stop counts can't be interpolated stop-for-stop: snap to target.
	if (a.colors.length !== b.colors.length) {
		write(to);
		onComplete?.();
		resolveFinished();
		return { finished, cancel: () => {} };
	}

	let frame: number | null = null;
	let startTime = 0;
	let done = false;

	const finish = (): void => {
		if (done) return;
		done = true;
		if (frame != null) cancelAnimationFrame(frame);
		frame = null;
		resolveFinished();
	};

	const render = (t: number): void => {
		const e = easing(t);
		const stops = a.colors.map((color, i) => ({
			rgba: lerpRGBA(color, b.colors[i]!, e),
			pos: lerp(a.positions[i]!, b.positions[i]!, e)
		}));
		write(formatLinearGradient(lerp(a.angle, b.angle, e), stops));
	};

	const tick = (now: number): void => {
		if (!startTime) startTime = now + delay;
		const elapsed = now - startTime;
		if (elapsed < 0) {
			frame = requestAnimationFrame(tick);
			return;
		}
		const t = duration <= 0 ? 1 : Math.min(elapsed / duration, 1);
		render(t);
		if (t >= 1) {
			onComplete?.();
			finish();
		} else {
			frame = requestAnimationFrame(tick);
		}
	};

	render(0);
	frame = requestAnimationFrame(tick);

	return {
		finished,
		cancel: finish
	};
};
